import React from "react";
import { Controller } from "react-hook-form";
import {
  Autocomplete,
  CircularProgress,
  TextField,
  FormHelperText,
} from "@mui/material";
import useSearch from "hooks/useSearch";
import { getAddress } from "utils/helpers/getAddress";

const AddressSearch = ({ control, errors }) => {
  const address = useSearch("");

  return (
    <>
      <Controller
        control={control}
        name="address"
        rules={{
          validate: {
            required: (value) => {
              if (!value) return "Facility address is required.";
              if (!getAddress(value))
                return "We weren't able to get an address from this location. Please choose a different address.";
              return true;
            },
          },
        }}
        render={({ field: { onChange, value } }) => (
          <Autocomplete
            id="address"
            options={address.suggestions}
            onChange={(event, item) => onChange(item)}
            value={value || null}
            loading={address.loading}
            noOptionsText="No results found"
            getOptionLabel={(option) => option.place_name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Address"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {address.loading && (
                        <CircularProgress color="primary" size={20} />
                      )}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
                onChange={(v) => address.onChange(v)}
                variant="outlined"
                error={!!errors.address}
              />
            )}
          />
        )}
      />
      {errors?.address && (
        <FormHelperText error={true}>{errors.address.message}</FormHelperText>
      )}
    </>
  );
};

export default AddressSearch;
