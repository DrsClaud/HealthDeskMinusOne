import React from "react";
import algoliasearch from "algoliasearch/lite";
import { InstantSearch } from "react-instantsearch";
import { useInstantSearch, useSearchBox } from "react-instantsearch";
import { useDebounce } from "use-debounce";

import capitalize from "../utils/helpers/capitalize";
import { Controller } from "react-hook-form";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

const searchClient = algoliasearch(
  "3EXOAGRBY5",
  "2c2518393a1de3e22c513c5be0b0b914"
);

const EmergencySearch = ({ control, errors }) => {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="emergencydepartments"
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <MuiAutocomplete control={control} errors={errors} />
    </InstantSearch>
  );
};

const MuiAutocomplete = ({ control, errors }) => {
  const { query, refine } = useSearchBox();
  const { results, status } = useInstantSearch();

  const [debouncedQuery] = useDebounce(query, 300);

  // Always show results - let Algolia handle the initial set
  const filteredResults = results.hits || [];

  return (
    <Controller
      control={control}
      name="emergency_location"
      rules={{
        required: "Please select an Emergency Department from the list.",
        validate: (value) => {
          if (!value || typeof value !== "object" || !value.id) {
            return "Please select an Emergency Department from the search results.";
          }
          return true;
        },
      }}
      render={({ field: { onChange, value } }) => (
        <Autocomplete
          id="emergency_location"
          options={filteredResults}
          onChange={(event, item) => {
            onChange(item);
          }}
          value={value || null}
          loading={status === "loading"}
          noOptionsText="No results found"
          getOptionLabel={(option) => {
            return `${capitalize(option.name)}, ${capitalize(option.city)}, ${
              option.state
            } ${option.zip}`;
          }}
          isOptionEqualToValue={(option, value) => {
            return option?.id === value?.id;
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Emergency Department"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {status === "loading" ? (
                      <CircularProgress color="primary" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              onChange={(v) => {
                // Refine directly - debouncing is handled by the useDebounce hook
                const searchValue = v.target.value || "";
                if (typeof searchValue === "string") {
                  refine(searchValue);
                }
              }}
              variant="outlined"
              helperText={
                errors?.emergency_location?.message ||
                "If your facility is not found, please register as Clinic instead."
              }
              error={!!errors.emergency_location}
            />
          )}
        />
      )}
    />
  );
};

export default EmergencySearch;
