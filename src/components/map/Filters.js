import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Button,
} from "@mui/material";
import { StarRounded } from "@mui/icons-material";

const Filters = ({
  setFilter,
  filter,
  ads = [],
  sx = {},
  style = {},
  onSortLevelOfCare,
}) => {
  // Set default values if not already set
  React.useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      facility: prev.facility || "all",
      rating: prev.rating || 0,
    }));
  }, [setFilter]);

  // Determine if we should show star rating select
  const showStarRating = filter.facility === "emergency";

  // Helper function for handling filter changes
  const handleFilterChange = (field) => (event) => {
    setFilter((prev) => {
      const newState = {
        ...prev,
        [field]: event.target.value,
        ...(field === "facility" &&
          event.target.value !== "emergency" && { rating: "" }),
        ...(field === "facility" &&
          event.target.value === "emergency" && { group: "", rating: 1 }),
      };
      return newState;
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        maxWidth: "500px",
        margin: "auto",
        marginBottom: { xs: 0, sm: 2 },
        ...sx,
      }}
      style={style}
    >
      {/* Left Column - Radio Buttons */}
      <Box
        sx={{
          width: "50%",
          padding: "0 8px 0 0",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            height: "100%",
            gap: { xs: 0.5, sm: 0 },
          }}
        >
          <Typography
            variant="h6"
            color="primary"
            sx={{
              whiteSpace: "nowrap",
              marginRight: { xs: 0, sm: "3px" },
              fontSize: "1.125rem",
              fontWeight: "500",
            }}
          >
            I need care:
          </Typography>
          <RadioGroup
            value={filter.facility || "all"}
            onChange={handleFilterChange("facility")}
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 0.5, sm: 0 },
            }}
          >
            <FormControlLabel
              value="clinic"
              control={<Radio size="small" />}
              label="Soon"
              sx={{
                margin: 0,
                height: "24px",
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.875rem",
                },
              }}
            />
            <FormControlLabel
              value="emergency"
              control={<Radio size="small" />}
              label="Immediately"
              sx={{
                margin: 0,
                height: "24px",
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </RadioGroup>
        </Box>
      </Box>

      {/* Right Column - Star Rating or Help Button */}
      <Box
        sx={{
          width: "50%",
          padding: "0 0 0 8px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          height: { xs: "auto", sm: "48px" },
          marginTop: { xs: 0, sm: 0 },
        }}
      >
        {showStarRating ? (
          <FormControl
            size="small"
            sx={{
              width: "100%",
              "& .MuiInputBase-root": {
                height: "40px",
              },
            }}
          >
            <InputLabel id="star-rating-label">Star Rating</InputLabel>
            <Select
              labelId="star-rating-label"
              id="star-rating"
              value={filter.rating || 1}
              label="Star Rating"
              onChange={handleFilterChange("rating")}
              sx={{
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                },
              }}
            >
              {[1, 5, 4, 3, 2].map((value) => (
                <MenuItem key={value} value={value}>
                  {value === 1 ? (
                    "All"
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {[...Array(value)].map((_, i) => (
                        <StarRounded
                          key={i}
                          sx={{
                            color: "#FFC404",
                            width: "1.25rem",
                            height: "1.25rem",
                          }}
                        />
                      ))}
                      {value !== 5 && (
                        <span style={{ paddingLeft: "3px" }}>+</span>
                      )}
                    </Box>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Button
            onClick={onSortLevelOfCare}
            variant="outlined"
            size="small"
            sx={{
              fontSize: "13px",
              width: "100%",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Help Me Choose
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default Filters;
