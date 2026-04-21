import React, { useEffect, useState, useRef } from "react";
import Legend from "./map/Legend";
import { ReactComponent as SeatIcon } from "assets/images/chair.svg";
import { ReactComponent as SeatFilledIcon } from "assets/images/chair-filled.svg";

import { AccessTimeRounded } from "@mui/icons-material";
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  useTheme,
  alpha,
  Tooltip,
  Skeleton,
} from "@mui/material";

const SeatRating = ({
  register,
  schedule,
  value,
  date,
  defaultTime,
  getValues,
  showLegend = false,
  currentValue,
  onChange,
  disabled = false,
  disabledMessage = null,
}) => {
  const [selected, setSelected] = useState();
  const options = [30, 60, 120, 150, 180, 240, 360];
  const radioGroupRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    if (schedule && getValues) {
      // Get the current form value for the scheduled date/time
      const formValue = getValues("time-" + date);

      // Only set if there's a value (null/undefined should clear selection)
      if (formValue !== null && formValue !== undefined) {
        setSelected(formValue);
      } else {
        setSelected(undefined);
      }
    }
  }, [getValues, date, schedule]);

  useEffect(() => {
    if (value) setSelected(undefined);
  }, [value]);

  // Helper function to determine if a seat should be filled
  const shouldBeFilled = (option) => {
    // First check for controlled component usage
    if (currentValue !== undefined) {
      return option <= Number(currentValue);
    }

    // Fall back to legacy behavior
    const legacyValue = Number(selected || value || defaultTime);
    // If all values are null/undefined, return false (no filled seats)
    if (isNaN(legacyValue)) return false;
    return option <= legacyValue;
  };

  // Get the actual current value, handling null/undefined properly
  const getCurrentValue = () => {
    // Check for controlled component mode first
    if (currentValue !== undefined) {
      return currentValue || "";
    }

    // Legacy mode
    if (selected === null || selected === undefined) {
      return ""; // Empty string for RadioGroup (represents no selection)
    }
    return selected || value || defaultTime || 30;
  };

  // Handle radio button change
  const handleChange = (e) => {
    if (disabled) return;

    const newValue = Number(e.target.value);

    // If in controlled mode, call the onChange handler
    if (onChange) {
      onChange(newValue);
    }

    // For backward compatibility
    setSelected(newValue);
  };

  // SVG Props for proper sizing and display
  const svgProps = {
    width: 52,
    height: 52,
    viewBox: "0 0 85 118",
    preserveAspectRatio: "xMidYMid meet",
  };

  // Custom color that's between text.primary and text.secondary
  const midToneColor = alpha(theme.palette.text.primary, 0.75);
  // Get the disabled color - more faded than regular
  const disabledColor = theme.palette.action.disabled;

  // Wrap RadioGroup with Tooltip if disabled with a message
  const renderRadioGroup = () => {
    const radioGroupContent = (
      <RadioGroup
        ref={radioGroupRef}
        row
        sx={{
          display: "flex",
          flexGrow: 1,
          opacity: disabled ? 0.5 : 1,
        }}
        value={getCurrentValue()}
        onChange={handleChange}
        name={schedule ? "time-" + date : "time"}
      >
        {options.map((option) => {
          const isFilled = shouldBeFilled(option);

          return (
            <FormControlLabel
              key={option}
              value={option}
              disabled={disabled}
              control={
                <Radio
                  icon={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isFilled ? (
                        <SeatFilledIcon
                          {...svgProps}
                          style={{
                            fill: disabled
                              ? disabledColor
                              : theme.palette.primary.main,
                          }}
                        />
                      ) : (
                        <SeatIcon
                          {...svgProps}
                          style={{
                            fill: disabled ? disabledColor : midToneColor,
                          }}
                        />
                      )}
                    </Box>
                  }
                  checkedIcon={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SeatFilledIcon
                        {...svgProps}
                        style={{
                          fill: disabled
                            ? disabledColor
                            : theme.palette.primary.main,
                        }}
                      />
                    </Box>
                  }
                  checked={
                    // For controlled component mode
                    currentValue !== undefined
                      ? option === Number(currentValue)
                      : // Legacy mode
                        option === Number(selected || value || defaultTime)
                  }
                  sx={{
                    padding: 0,
                    mx: 0.4,
                  }}
                  inputProps={{
                    ...(register &&
                      register(schedule ? "time-" + date : "time", {
                        onChange: (e) => {
                          if (!disabled) {
                            setSelected(Number(e.target.value));
                          }
                        },
                      })),
                  }}
                />
              }
              sx={{
                margin: 0,
                "&:hover": {
                  "& .MuiRadio-root svg": disabled
                    ? {}
                    : {
                        opacity: 1,
                        transform: "scale(1.05)",
                        transition: "transform 0.2s",
                      },
                },
                cursor: disabled ? "not-allowed" : "pointer",
              }}
              label=""
            />
          );
        })}
      </RadioGroup>
    );

    // If disabled and has a message, wrap with tooltip
    if (disabled && disabledMessage) {
      return (
        <Tooltip title={disabledMessage} placement="top">
          <Box sx={{ display: "flex", flexGrow: 1 }}>{radioGroupContent}</Box>
        </Tooltip>
      );
    }

    return radioGroupContent;
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          maxWidth: 450,
          width: "100%",
          alignItems: "flex-start",
        }}
      >
        {renderRadioGroup()}
        <AccessTimeRounded
          sx={{
            width: 36,
            color: disabled ? "action.disabled" : "grey.500",
            mt: 0.5,
          }}
        />
      </Box>

      {showLegend && (
        <Box
          sx={{
            maxWidth: 450,
            width: "100%",
            height: 20,
            mt: 1,
          }}
        >
          <Legend />
        </Box>
      )}
    </>
  );
};

export default SeatRating;
