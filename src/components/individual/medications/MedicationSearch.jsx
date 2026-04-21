import React, { useState, useEffect, useCallback } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Alert,
  CircularProgress,
  debounce,
  Typography,
  FormHelperText,
  Chip,
} from "@mui/material";
import { MedicationRounded, VerifiedRounded } from "@mui/icons-material";
import { useDebounce } from "use-debounce";
import { rxTermsService } from "../../../services/rxTermsService";

const MedicationSearch = ({
  value,
  onChange,
  onSelect,
  disabled = false,
  error = null,
  helperText = "",
  placeholder = "Search for medication...",
  fullWidth = true,
}) => {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce inputValue for showing manual entry alert (reduces visual noise)
  const [debouncedInputValue] = useDebounce(inputValue, 500);

  // Debounced search function using verified medication database
  const debouncedSearch = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm || searchTerm.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSearchError(null);

      try {
        const medications = await rxTermsService.searchMedications(
          searchTerm,
          10
        );
        setOptions(medications);
        setHasSearched(true);
      } catch (error) {
        console.error("Medication search error:", error);
        setSearchError("Failed to search medications. Please try again.");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Effect to sync inputValue with value prop changes (e.g., when parent clears or sets medication)
  useEffect(() => {
    if (value) {
      if (typeof value === "string") {
        setInputValue(value);
      } else if (typeof value === "object" && value?.name) {
        const { cleanName } = parseMedicationName(
          value.displayName || value.name
        );
        setInputValue(cleanName);
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  // Effect to trigger search when input changes
  useEffect(() => {
    if (inputValue) {
      debouncedSearch(inputValue);
    } else {
      setOptions([]);
      setLoading(false);
    }
  }, [inputValue, debouncedSearch]);

  // Handle input change
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);

    if (onChange) {
      // If user is manually typing and we currently have a verified medication selected,
      // we need to check if the typed text still matches the verified medication
      if (typeof value === "object" && value?.rxcui) {
        const { cleanName } = parseMedicationName(
          value.displayName || value.name
        );

        // If the typed text doesn't match the selected verified medication name,
        // clear the verified data and just pass the string
        if (newInputValue !== cleanName) {
          onChange(newInputValue); // Pass just the string, clearing verified metadata
          // CRITICAL: Also call onSelect to clear the parent's selectedMedication state
          if (onSelect) {
            onSelect(newInputValue);
          }
        } else {
          // Text still matches, keep the verified object
          onChange(value);
        }
      } else {
        // No verified object selected, just pass the string
        onChange(newInputValue);
      }
    }
  };

  // Handle option selection
  const handleChange = (event, newValue) => {
    if (onSelect) {
      onSelect(newValue);
    }
  };

  // Parse brand name from medication name (removes brackets)
  const parseMedicationName = (name) => {
    if (!name) return { cleanName: "", brandName: "" };

    const brandMatch = name.match(/^(.+?)\s*\[([^\]]+)\]$/);
    if (brandMatch) {
      return {
        cleanName: brandMatch[1].trim(),
        brandName: brandMatch[2].trim(),
      };
    }
    return { cleanName: name, brandName: "" };
  };

  // Render medication option with verified data
  const renderOption = (props, option, { index }) => {
    // Use index + rxcui for truly unique keys
    const uniqueKey = `${option.rxcui}-${index}`;
    const { key, ...otherProps } = props;
    const { cleanName, brandName } = parseMedicationName(
      option.displayName || option.name
    );

    return (
      <Box component="li" key={uniqueKey} {...otherProps} sx={{ p: 2 }}>
        <MedicationRounded sx={{ mr: 2, color: "primary.main" }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: "medium",
              lineHeight: 1.25,
              mb: 0.4,
            }}
          >
            {cleanName}
          </Typography>
          {brandName && (
            <Typography
              variant="body2"
              color="primary.main"
              sx={{
                fontWeight: 500,
                lineHeight: 1.2,
                mb: 0.5,
              }}
            >
              Brand: {brandName}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              lineHeight: 1.1,
              display: "block",
            }}
          >
            {option.type}
          </Typography>
        </Box>
      </Box>
    );
  };

  // Get display value for selected option (clean name without brackets)
  const getOptionLabel = (option) => {
    if (typeof option === "string") {
      return option;
    }
    const name = option.displayName || option.name || "";
    const { cleanName } = parseMedicationName(name);
    return cleanName;
  };

  // Determine if options are equal
  const isOptionEqualToValue = (option, value) => {
    if (typeof option === "string" && typeof value === "string") {
      return option === value;
    }
    if (typeof option === "object" && typeof value === "object") {
      return option.rxcui === value.rxcui;
    }
    return false;
  };

  return (
    <Box>
      <Autocomplete
        value={value}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={options ?? []}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        renderOption={renderOption}
        loading={loading}
        disabled={disabled}
        fullWidth={fullWidth}
        freeSolo
        selectOnFocus
        handleHomeEndKeys
        filterOptions={(x) => x} // Disable built-in filtering since we handle it via API
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            placeholder={placeholder}
            error={!!error}
            helperText={helperText}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={
          loading ? (
            <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Searching medication database...
            </Box>
          ) : hasSearched && inputValue && inputValue.length >= 2 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No medications found in our database. You can still enter "
                {inputValue}" manually.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Start typing to search medications...
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 1, display: "block" }}
              >
                Powered by NIH RxTerms database
              </Typography>
            </Box>
          )
        }
        sx={{
          "& .MuiAutocomplete-option": {
            alignItems: "flex-start",
          },
        }}
      />

      {searchError && (
        <FormHelperText error sx={{ mt: 1 }}>
          {searchError}
        </FormHelperText>
      )}

      {/* Show verification OR manual entry alert - never both */}
      {value &&
      typeof value === "object" &&
      value?.rxcui &&
      inputValue &&
      inputValue ===
        parseMedicationName(value.displayName || value.name).cleanName ? (
        <Alert severity="success" sx={{ mt: 1 }}>
          "{parseMedicationName(value.displayName || value.name).cleanName}" is
          verified in our medication database.
        </Alert>
      ) : (
        debouncedInputValue &&
        debouncedInputValue.length >= 2 &&
        !loading && (
          <Alert severity="info" sx={{ mt: 1 }}>
            "{debouncedInputValue}" will be added manually as it's not in our
            verified medication database.
          </Alert>
        )
      )}
    </Box>
  );
};

export default MedicationSearch;
