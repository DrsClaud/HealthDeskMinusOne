import React, { useState } from "react";
import { LoadingButton } from "@mui/lab";
import {
  Autocomplete,
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
import { Controller, useForm } from "react-hook-form";
import LogoLarge from "../styled/LogoLarge";
import useSearch from "hooks/useSearch";

export default ({ open, close, setCoords, setCustomLocation }) => {
  const address = useSearch("", "address,place,postcode");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState();
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ location }) => {
    setServerError(false);
    setLoading(true);

    if (location) {
      const lat = location.center[1];
      const lng = location.center[0];

      // Get the ZIP code from mapbox response
      const contextZip = location.context.find((a) =>
        a?.id.startsWith("postcode")
      )?.text;
      const placenameZip = location.place_name.match(/\d{5}(?:[-\s]\d{4})?/g);
      const zip = contextZip || placenameZip?.[placenameZip?.length - 1];

      // Save to localStorage
      localStorage.setItem("userLocation", JSON.stringify({ lat, lng, zip }));

      setCoords({ lat, lng });
      setCustomLocation({ lat, lng, zip });
      setLoading(false);
      close();
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{ textAlign: "center" }}>
          <LogoLarge />
          Where are you?
        </DialogTitle>

        <DialogContent>
          <DialogContentText
            variant="body1"
            sx={{ textAlign: "center", pb: 3 }}
          >
            We couldn't get your location. We need your location to show you the
            best facilities in your area.
          </DialogContentText>

          <Controller
            control={control}
            name="location"
            rules={{ required: "Please enter a location or ZIP code." }}
            render={({ field: { onChange, value } }) => (
              <Autocomplete
                id="address"
                options={address.suggestions}
                onChange={(event, item) => {
                  onChange(item);
                }}
                value={value || null}
                loading={address.loading}
                noOptionsText={"No results found"}
                getOptionLabel={(option) => option.place_name || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Your location/ZIP code"
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
                    autoFocus
                    onChange={(v) => address.onChange(v)}
                    variant="standard"
                    error={!!errors.location}
                  />
                )}
              />
            )}
          />
          {errors?.address ? (
            <FormHelperText error={true}>
              {errors.location.message}
            </FormHelperText>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ d: "flex", flexDirection: "column", p: 3, pt: 2 }}>
          <LoadingButton
            loading={loading}
            type="submit"
            disabled={loading}
            fullWidth
            variant="contained"
            sx={{ mb: 1 }}
          >
            Find Health Care in Your Area
          </LoadingButton>

          <Button onClick={close} fullWidth>
            Skip for now
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
