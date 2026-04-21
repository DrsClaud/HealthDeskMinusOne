import React, { useState } from "react";
import firebaseApp, { db } from "services/firebase";
import "firebase/compat/storage";
import { Controller, useForm } from "react-hook-form";
import {
  Autocomplete,
  Backdrop,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormHelperText,
  TextField,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import capitalize from "utils/helpers/capitalize";
import useSearch from "hooks/useSearch";
import { getAddress } from "utils/helpers/getAddress";
import { getStateCode } from "utils/helpers/getStateCode";
import firebase from "firebase/compat/app";
import * as geohash from "ngeohash";

const AddressSettings = ({ location, visible, close, setSubmitted }) => {
  const address = useSearch("");
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState();
  const [firebaseError, setFirebaseError] = useState();

  const updateLocation = (updatedLocation) => {
    db.collection("locations")
      .doc(String(location.id))
      .update(updatedLocation)
      .then((l) => {
        setLoading(false);
        setSubmitted("Your facility address has been updated.");
        close();
      });
  };

  // If location data not loaded yet, return loading screen
  if (!location) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={visible}
        onClick={close}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  const onSubmit = ({ newlocation, group }) => {
    if (!newlocation && !group) {
      setFirebaseError("Please update at least one field.");
      return;
    }

    setFirebaseError();
    setLoading(true);
    setSubmitted(false);

    const updatedLocation = {};

    // Handle address update if provided
    if (newlocation) {
      const lookup = (name) =>
        newlocation.context.find((a) => a?.id.startsWith(name))?.text;
      const address = getAddress(newlocation);
      const city = lookup("place");
      const state = getStateCode(newlocation);
      const zip = lookup("postcode");
      const latitude = newlocation.center[1];
      const longitude = newlocation.center[0];
      const geopoint = new firebase.firestore.GeoPoint(latitude, longitude);
      const hash = geohash.encode(latitude, longitude);

      Object.assign(updatedLocation, {
        lat: latitude,
        lng: longitude,
        address,
        city,
        state,
        zip,
        coordinates: geopoint,
        g: {
          geohash: hash,
          geopoint,
        },
      });
    }

    // Handle group update if provided
    if (group !== undefined) {
      updatedLocation.group = group;
    }

    updateLocation(updatedLocation);
  };

  let currentAddress =
    capitalize(`${location?.address}, ${location?.city}, `) +
    `${location?.state?.toUpperCase()} ${location?.zip}`;

  return (
    <Dialog open={visible} onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Update Your Facility Information</DialogTitle>

        <DialogContent>
          <DialogContentText variant="body2" sx={{ pb: 3 }}>
            Your current address is <strong>{currentAddress}</strong>.
          </DialogContentText>

          <Controller
            name="newlocation"
            control={control}
            rules={{
              validate: {
                required: (value) => {
                  if (value && !getAddress(value))
                    return "We weren't able to get an address from this location. Please choose a different address.";
                },
              },
            }}
            render={({ field: { onChange, value } }) => (
              <Autocomplete
                id="newlocation"
                options={address.suggestions}
                onChange={(event, item) => {
                  onChange(item);
                }}
                getOptionLabel={(option) => option.place_name || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={value || null}
                noOptionsText={"No results found"}
                loading={address.loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    onChange={(newValue) => {
                      address.onChange(newValue);
                    }}
                    placeholder={currentAddress}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {address.loading ? (
                            <CircularProgress color="primary" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                    label="Facility Address"
                    variant="standard"
                    error={!!errors?.newlocation}
                    helperText={errors?.newlocation?.message}
                    sx={{ mb: 3 }}
                  />
                )}
              />
            )}
          />

          {/* Facility Group Name field */}
          <Controller
            name="group"
            control={control}
            defaultValue={location?.group || ""}
            rules={{
              maxLength: {
                value: 50,
                message: "Group name must be 50 characters or less.",
              },
              validate: {
                noNewlines: (value) =>
                  !value.includes("\n") ||
                  "Group name cannot contain line breaks.",
              },
            }}
            render={({ field }) => (
              <TextField
                id="group"
                label="Facility Group Name (Optional)"
                type="text"
                InputLabelProps={{ shrink: true }}
                variant="standard"
                fullWidth
                error={!!errors?.group}
                helperText={
                  errors?.group?.message ||
                  "Use the same name across multiple facility accounts to group them together on maps. Leave blank if you only have one location."
                }
                {...field}
              />
            )}
          />

          {firebaseError ? (
            <FormHelperText error sx={{ mt: 1 }}>
              {firebaseError}
            </FormHelperText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <LoadingButton
            loading={loading}
            type="submit"
            disabled={loading}
            autoFocus
            variant="contained"
          >
            Update Facility
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddressSettings;
