import React from "react";
import useSearch from "hooks/useSearch";
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Paper,
} from "@mui/material";

export default ({
  setCoords,
  setAddress,
  addressField = false,
  searchLoaded = true,
  open = true,
  setCustomLocation,
}) => {
  const address = useSearch(
    "",
    addressField ? "address" : "address,place,postcode"
  );

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        maxHeight: open ? "50px" : 0,
        overflow: "hidden",
        transition: "all 200ms ease-in-out",
      }}
    >
      <Box sx={{ p: 1, pt: 0 }}>
        <Autocomplete
          id="address"
          options={address.suggestions}
          loading={address.loading}
          noOptionsText={"No results found"}
          getOptionLabel={(option) => option.place_name || ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(e, location) => {
            if (location) {
              const lat = location.center[1];
              const lng = location.center[0];

              // Get the ZIP code. There's a couple of ways it might be revealed through mapbox so we have to parse them
              const contextZip = location.context.find((a) =>
                a?.id.startsWith("postcode")
              )?.text;
              const placenameZip =
                location.place_name.match(/\d{5}(?:[-\s]\d{4})?/g);

              let zip;
              if (contextZip || placenameZip)
                zip = contextZip || placenameZip[placenameZip?.length - 1];

              setAddress && setAddress(location.place_name);
              setCoords && setCoords({ lat, lng });
              setCustomLocation && setCustomLocation({ lat, lng, zip });
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={`Search for ${
                addressField ? "an" : "a city or"
              } address`}
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
                endAdornment: (
                  <React.Fragment>
                    {address.loading || !searchLoaded ? (
                      <CircularProgress color="primary" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
              onChange={(v) => address.onChange(v)}
              variant="standard"
              size="small"
            />
          )}
        />
      </Box>
    </Paper>
  );
};
