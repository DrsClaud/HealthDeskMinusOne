import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Tooltip,
  Snackbar,
  Skeleton,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  format,
  setHours,
  isBefore,
  startOfDay,
  addDays,
  subDays,
  isAfter,
  getHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  differenceInDays,
} from "date-fns";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CloseIcon from "@mui/icons-material/Close";
import SeatRating from "../SeatRating";
import Legend from "../map/Legend";

// Maximum days in the future users can schedule
const MAX_FUTURE_DAYS = 30;

const TIME_SLOTS = [
  { label: "6 AM", hours: 6 },
  { label: "10 AM", hours: 10 },
  { label: "2 PM", hours: 14 },
  { label: "6 PM", hours: 18 },
  { label: "10 PM", hours: 22 },
];

// Create timestamp with exact hour (no minutes, seconds or milliseconds)
const createExactTimestamp = (date, hours) => {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, hours), 0), 0),
    0
  ).getTime();
};

// Use a consistent key to store temporary schedule data in sessionStorage
const TEMP_SCHEDULE_KEY = "healthdesk_temp_schedule";
// Store copied day data for paste functionality
const COPIED_DAY_KEY = "healthdesk_copied_day";

const DailyScheduler = ({
  onSubmit,
  loading = false,
  submitted = false,
  facilityData,
  previewMode = false,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateError, setDateError] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({});
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const today = startOfDay(new Date());
  const maxDate = addDays(today, MAX_FUTURE_DAYS);
  const legendRef = useRef(null);
  const dateDisplayRef = useRef(null);
  const prevFacilityDataRef = useRef();
  const prevSubmittedRef = useRef(submitted);
  const [dataLoading, setDataLoading] = useState(true);

  // Load saved schedule data from sessionStorage
  const loadStoredSchedule = () => {
    try {
      const storedData = sessionStorage.getItem(TEMP_SCHEDULE_KEY);
      return storedData ? JSON.parse(storedData) : {};
    } catch (e) {
      console.error("Error loading schedule from sessionStorage:", e);
      return {};
    }
  };

  // Save schedule data to sessionStorage
  const saveScheduleToStorage = (data) => {
    try {
      console.log("Saving to storage:", JSON.stringify(data));
      sessionStorage.setItem(TEMP_SCHEDULE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving schedule to sessionStorage:", e);
    }
  };

  // Load clipboard data from sessionStorage
  const loadClipboard = () => {
    try {
      const clipboardData = sessionStorage.getItem(COPIED_DAY_KEY);
      if (clipboardData) {
        return JSON.parse(clipboardData);
      }
      return null;
    } catch (e) {
      console.error("Error loading clipboard from sessionStorage:", e);
      return null;
    }
  };

  // Initialize clipboard from sessionStorage
  useEffect(() => {
    const savedClipboard = loadClipboard();
    if (savedClipboard) {
      setClipboard(savedClipboard);
    }
  }, []);

  // Process facility data and extract scheduled times
  const processNewFacilityData = (facilityData) => {
    if (!facilityData?.waitTimes?.length) return {};

    console.log(
      "PROCESS - Processing facility data with waitTimes length:",
      facilityData.waitTimes.length
    );

    // Get only scheduled entries in the future, within our time limit
    const validFutureEntries = facilityData.waitTimes.filter(
      (entry) =>
        entry.scheduled &&
        isAfter(new Date(entry.date), today) &&
        differenceInDays(new Date(entry.date), today) <= MAX_FUTURE_DAYS
    );

    console.log("PROCESS - Valid future entries:", validFutureEntries.length);

    // Create schedule data structure
    const newSchedule = {};
    const seenKeys = new Set(); // Track unique date-hour-waitTime combinations

    validFutureEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const dateStr = format(entryDate, "yyyy-MM-dd");
      const hours = getHours(entryDate);
      const uniqueKey = `${dateStr}-${hours}-${entry.waitTime}`;

      // Skip if we've already processed this exact combination
      if (seenKeys.has(uniqueKey)) {
        console.log(`PROCESS - Skipping duplicate: ${uniqueKey}`);
        return;
      }

      seenKeys.add(uniqueKey);

      if (!newSchedule[dateStr]) {
        newSchedule[dateStr] = {};
      }

      console.log(
        `PROCESS - Adding: date=${dateStr}, hour=${hours}, waitTime=${entry.waitTime}`
      );
      newSchedule[dateStr][hours] =
        typeof entry.waitTime === "string"
          ? parseInt(entry.waitTime, 10)
          : entry.waitTime;
    });

    console.log("PROCESS - Final processed schedule:", newSchedule);
    return newSchedule;
  };

  // Initialize from facility data and sessionStorage
  useEffect(() => {
    if (initialLoadDone) return;

    console.log("INIT - Starting initial data load");
    setDataLoading(true);

    // Clear any stale data first to ensure a fresh start
    try {
      console.log("INIT - Clearing session storage on load");
      sessionStorage.removeItem(TEMP_SCHEDULE_KEY);
    } catch (e) {
      console.error("Error clearing temp schedule from sessionStorage:", e);
    }

    // Process facility data only - don't load from sessionStorage on initial load
    const facilitySchedule = processNewFacilityData(facilityData);
    console.log("INIT - Processed facility data:", facilitySchedule);

    // Update state with facility data only
    setScheduleData(facilitySchedule);
    saveScheduleToStorage(facilitySchedule);

    setInitialLoadDone(true);
    prevFacilityDataRef.current = facilityData;
    console.log("INIT - Initial load complete");

    // Add a small delay to ensure UI is consistent
    setTimeout(() => {
      setDataLoading(false);
    }, 300);
  }, [facilityData, today]);

  // Update schedule data when facilityData changes
  useEffect(() => {
    if (!initialLoadDone) return;

    const currentFacilityData = facilityData;
    const prevFacilityData = prevFacilityDataRef.current;

    // Skip if it's the same data or there is no new data
    if (!currentFacilityData || currentFacilityData === prevFacilityData) {
      return;
    }

    // Process the new facility data
    const facilitySchedule = processNewFacilityData(currentFacilityData);

    // Update our schedule with the new facility data
    setScheduleData((prevSchedule) => {
      const updatedSchedule = { ...prevSchedule, ...facilitySchedule };
      saveScheduleToStorage(updatedSchedule);
      return updatedSchedule;
    });

    prevFacilityDataRef.current = currentFacilityData;
  }, [facilityData, initialLoadDone]);

  // Handle successful submission
  useEffect(() => {
    // Detect when submission changes from false to true
    if (submitted && !prevSubmittedRef.current && !loading) {
      // Don't clear the form when submission is successful
      // Just clear the sessionStorage to avoid duplicates
      try {
        sessionStorage.removeItem(TEMP_SCHEDULE_KEY);
      } catch (e) {
        console.error("Error clearing temp schedule from sessionStorage:", e);
      }
      setSnackbarMessage("Wait times scheduled successfully.");
      setSnackbarOpen(true);
    }

    prevSubmittedRef.current = submitted;
  }, [submitted, loading]);

  // Handle date change
  const handleDateChange = (date) => {
    if (!date) return;

    // Validate date is within allowed range
    if (isBefore(date, today)) {
      setDateError("Please select today or a future date");
      return;
    }

    if (differenceInDays(date, today) > MAX_FUTURE_DAYS) {
      setDateError(
        `Cannot schedule more than ${MAX_FUTURE_DAYS} days in advance`
      );
      return;
    }

    setDateError(null);
    setSelectedDate(date);
    setDatePickerOpen(false);
  };

  // Go to next day
  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (differenceInDays(nextDay, today) <= MAX_FUTURE_DAYS) {
      handleDateChange(nextDay);
    } else {
      setDateError(
        `Cannot schedule more than ${MAX_FUTURE_DAYS} days in advance`
      );
    }
  };

  // Go to previous day
  const goToPrevDay = () => {
    const prevDay = subDays(selectedDate, 1);
    if (!isBefore(prevDay, today)) {
      handleDateChange(prevDay);
    } else {
      setDateError("Cannot go earlier than today");
    }
  };

  // Handle wait time selection
  const handleWaitTimeChange = (hours, waitTime) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Create a new schedule object with the updated value
    const updatedSchedule = { ...scheduleData };

    if (!updatedSchedule[dateStr]) {
      updatedSchedule[dateStr] = {};
    }

    if (waitTime) {
      updatedSchedule[dateStr][hours] = waitTime;
    } else {
      // Remove the entry if waitTime is null/0
      delete updatedSchedule[dateStr][hours];

      // Remove the date if no time slots are set
      if (Object.keys(updatedSchedule[dateStr]).length === 0) {
        delete updatedSchedule[dateStr];
      }
    }

    // Update state and sessionStorage
    setScheduleData(updatedSchedule);
    saveScheduleToStorage(updatedSchedule);
  };

  // Copy current day's schedule to clipboard
  const copyCurrentDay = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const currentDayData = scheduleData[dateStr] || {};

    console.log(`COPY - Copying data for date ${dateStr}:`, currentDayData);

    // Create a deep copy to avoid reference issues
    const clipboardCopy = JSON.parse(JSON.stringify(currentDayData));

    // Store in state
    setClipboard(clipboardCopy);

    // Store in sessionStorage for persistence
    try {
      const clipboardJson = JSON.stringify(clipboardCopy);
      console.log(`COPY - Saving to clipboard: ${clipboardJson}`);
      sessionStorage.setItem(COPIED_DAY_KEY, clipboardJson);
    } catch (e) {
      console.error("Error saving copied day to sessionStorage:", e);
    }

    // Show confirmation
    setSnackbarMessage("Schedule copied.");
    setSnackbarOpen(true);
  };

  // Paste clipboard data to current day
  const pasteToCurrentDay = () => {
    if (!clipboard || Object.keys(clipboard).length === 0) {
      setSnackbarMessage("Nothing to paste.");
      setSnackbarOpen(true);
      return;
    }

    console.log("PASTE - Current clipboard data:", clipboard);
    console.log("PASTE - Current schedule before paste:", scheduleData);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Create a new copy of the schedule data to avoid mutation issues
    const updatedSchedule = JSON.parse(JSON.stringify(scheduleData));

    // Create or get the current day's data
    if (!updatedSchedule[dateStr]) {
      updatedSchedule[dateStr] = {};
    }

    // Filter clipboard to only include non-null/non-undefined values
    const validClipboardEntries = Object.entries(clipboard).filter(
      ([_, waitTime]) => waitTime !== null && waitTime !== undefined
    );

    // Only paste if we have valid entries
    if (validClipboardEntries.length > 0) {
      // Add only non-null values from clipboard
      validClipboardEntries.forEach(([hours, waitTime]) => {
        console.log(`PASTE - Adding hour ${hours} with waitTime ${waitTime}`);
        updatedSchedule[dateStr][hours] = waitTime;
      });

      console.log("PASTE - Updated schedule after paste:", updatedSchedule);

      // Update state and sessionStorage
      setScheduleData(updatedSchedule);
      saveScheduleToStorage(updatedSchedule);

      // Show confirmation
      setSnackbarMessage("Schedule pasted.");
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage("No valid wait times to paste.");
      setSnackbarOpen(true);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    const scheduleEntries = [];
    const uniqueTimeKeys = new Set(); // Track unique time entries

    console.log("SUBMIT - Current schedule data:", scheduleData);

    // Convert schedule data to the format expected by the API
    Object.entries(scheduleData).forEach(([dateStr, timesObj]) => {
      // Skip empty days
      if (!timesObj || Object.keys(timesObj).length === 0) {
        console.log(`SUBMIT - Skipping empty date ${dateStr}`);
        return;
      }

      console.log(`SUBMIT - Processing date ${dateStr} with data:`, timesObj);

      Object.entries(timesObj).forEach(([hours, waitTime]) => {
        if (waitTime) {
          const timestamp = createExactTimestamp(
            new Date(dateStr),
            parseInt(hours, 10)
          );
          const uniqueKey = `${timestamp}-${waitTime}`;

          console.log(
            `SUBMIT - Considering entry: hour=${hours}, waitTime=${waitTime}, uniqueKey=${uniqueKey}`
          );

          // Only add if we haven't seen this exact time+waitTime combination
          if (!uniqueTimeKeys.has(uniqueKey)) {
            uniqueTimeKeys.add(uniqueKey);
            scheduleEntries.push({
              date: timestamp,
              waitTime: Number(waitTime),
              scheduled: true,
            });
            console.log(`SUBMIT - Added entry with key ${uniqueKey}`);
          } else {
            console.log(
              `SUBMIT - Skipped duplicate entry with key ${uniqueKey}`
            );
          }
        }
      });
    });

    console.log("SUBMIT - Final entries to submit:", scheduleEntries);
    console.log("SUBMIT - Unique keys:", Array.from(uniqueTimeKeys));

    if (scheduleEntries.length === 0) {
      setDateError("Please select at least one wait time to schedule");
      return;
    }

    onSubmit(scheduleEntries);

    // IMPORTANT: Clear session storage immediately after successful submission
    // to prevent reusing stale data
    try {
      console.log("SUBMIT - Clearing session storage");
      sessionStorage.removeItem(TEMP_SCHEDULE_KEY);
    } catch (e) {
      console.error("Error clearing temp schedule from sessionStorage:", e);
    }
  };

  // Get value for a specific time slot
  const getTimeSlotValue = (hours) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return scheduleData[dateStr]?.[hours] || null;
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // Check if a time slot is in the past
  const isTimeSlotPast = (hours) => {
    const now = new Date();
    const currentDate = startOfDay(now);
    const currentHours = now.getHours();

    // If selected date is today and the time slot hour is less than or equal to the current hour
    return (
      format(selectedDate, "yyyy-MM-dd") ===
        format(currentDate, "yyyy-MM-dd") && hours <= currentHours
    );
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, maxWidth: 540 }}>
        <IconButton
          onClick={goToPrevDay}
          disabled={previewMode || isBefore(subDays(selectedDate, 1), today)}
          sx={{ mr: 1 }}
          aria-label="Previous day"
        >
          <ArrowBackIosNewIcon />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <Typography variant="body1" fontWeight="medium" sx={{ mr: 1 }}>
            {format(selectedDate, "EEEE, MMMM d")}
          </Typography>
          <Box ref={dateDisplayRef}>
            <IconButton
              onClick={() => setDatePickerOpen(true)}
              disabled={previewMode}
              size="small"
              aria-label="Open date picker"
            >
              <CalendarMonthIcon fontSize="small" color="action" />
            </IconButton>
          </Box>
        </Box>

        <IconButton
          onClick={goToNextDay}
          sx={{ ml: 1 }}
          aria-label="Next day"
          disabled={
            previewMode ||
            differenceInDays(addDays(selectedDate, 1), today) > MAX_FUTURE_DAYS
          }
        >
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={handleDateChange}
          minDate={today}
          maxDate={maxDate}
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          slotProps={{
            popper: {
              anchorEl: dateDisplayRef.current,
              placement: "bottom",
            },
            textField: {
              fullWidth: true,
              variant: "outlined",
              sx: { display: "none" }, // Hide the input field
            },
          }}
        />
      </LocalizationProvider>

      {dateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dateError}
        </Alert>
      )}

      <Box sx={{ mb: 2, maxWidth: 540 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            maxWidth: 540,
          }}
        >
          <Typography variant="subtitle1" color="text.secondary">
            Select wait times for each period.
          </Typography>
          <Box>
            <Tooltip title="Copy this day's schedule">
              <span>
                <IconButton
                  onClick={copyCurrentDay}
                  color="primary"
                  disabled={
                    previewMode ||
                    !scheduleData[format(selectedDate, "yyyy-MM-dd")]
                  }
                >
                  <ContentCopyIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Paste schedule to this day">
              <span>
                <IconButton
                  onClick={pasteToCurrentDay}
                  color="primary"
                  disabled={
                    previewMode ||
                    !clipboard ||
                    Object.keys(clipboard).length === 0
                  }
                >
                  <ContentPasteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 2, maxWidth: 540 }}>
        <Grid container spacing={2.5}>
          {TIME_SLOTS.map(({ label, hours }, index) => {
            const isPast = isTimeSlotPast(hours);

            return (
              <Grid item xs={12} key={hours}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: { xs: 1, sm: 0 },
                      mr: { sm: 2 },
                      minWidth: { sm: 60 },
                      display: "flex",
                      pt: 1.75,
                      color: isPast ? "text.disabled" : "text.primary",
                    }}
                  >
                    {label}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {dataLoading ? (
                      <Skeleton
                        variant="rectangular"
                        width={360}
                        height={index === TIME_SLOTS.length - 1 ? 76 : 52}
                        animation="wave"
                        sx={{
                          borderRadius: 1,
                          backgroundColor: "rgba(0, 0, 0, 0.08)",
                        }}
                      />
                    ) : (
                      <SeatRating
                        schedule={true}
                        currentValue={getTimeSlotValue(hours)}
                        onChange={(value) => handleWaitTimeChange(hours, value)}
                        showLegend={index === TIME_SLOTS.length - 1}
                        disabled={isPast || previewMode}
                        disabledMessage={
                          isPast ? "This time slot has already passed" : null
                        }
                      />
                    )}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
          <LoadingButton
            variant="contained"
            onClick={previewMode ? undefined : handleSubmit}
            loading={loading}
            size="large"
            disabled={previewMode}
          >
            Save Schedule
          </LoadingButton>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity="success"
          sx={{ width: "100%" }}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleSnackbarClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyScheduler;
