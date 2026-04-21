import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Skeleton,
  Alert,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import {
  AccessTimeRounded,
  AddRounded,
  NotificationsRounded,
  NotificationsOffRounded,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { facilityAlertsService } from "../../services/facilityAlertsService";
import { getUserTimezoneWithFallback } from "../../utils/timezoneUtils";
import capitalize from "utils/helpers/capitalize";

const FacilityAlerts = ({
  facilityId,
  facilityName,
  lastWaitTimeUpdate,
  onAlertsChange,
}) => {
  const { userData, user } = useAuth();
  const [alertSettings, setAlertSettings] = useState(null);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [timeLoading, setTimeLoading] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [phoneVerifyDialogOpen, setPhoneVerifyDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("9:00 AM");
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [deletingTimeIndex, setDeletingTimeIndex] = useState(null);

  const isAlertsEnabled = alertSettings?.enabled;
  const alertTimes = alertSettings?.alertTimes || [];

  // Set up real-time listener for alert settings
  useEffect(() => {
    if (!user?.uid || !facilityId) return;

    const unsubscribe = facilityAlertsService.setupAlertSettingsListener(
      user.uid,
      facilityId,
      (settings) => {
        setAlertSettings(settings);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, facilityId]);

  // Handle alert toggle
  const handleAlertToggle = async (event) => {
    const enabled = event.target.checked;

    if (switchLoading) {
      event.preventDefault();
      return;
    }

    if (enabled) {
      // Check if phone is verified
      if (!userData?.phoneVerified) {
        setPhoneVerifyDialogOpen(true);
        return;
      }

      let userTimezone = getUserTimezoneWithFallback();

      try {
        setSwitchLoading(true);
        await facilityAlertsService.enableAlerts(
          user.uid,
          facilityId,
          facilityName,
          alertTimes,
          userTimezone
        );
        onAlertsChange?.();
      } catch (error) {
        console.error("Error enabling facility alerts:", error);
        alert("Failed to enable facility alerts. Please try again.");
      } finally {
        setSwitchLoading(false);
      }
    } else {
      try {
        setSwitchLoading(true);
        await facilityAlertsService.disableAlerts(user.uid, facilityId);
        onAlertsChange?.();
      } catch (error) {
        console.error("Error disabling facility alerts:", error);
        alert("Failed to disable facility alerts. Please try again.");
      } finally {
        setSwitchLoading(false);
      }
    }
  };

  // Handle adding new time
  const handleAddTime = () => {
    if (alertTimes.length >= 24) return;
    if (switchLoading || timeLoading) return;

    setSelectedTime("9:00 AM");
    setCurrentTimeIndex(alertTimes.length);
    setTimePickerOpen(true);
  };

  // Handle editing existing time
  const handleEditTime = (index) => {
    if (switchLoading || timeLoading) return;

    const displayTime = timeStringToDisplay(alertTimes[index]);
    setSelectedTime(displayTime);
    setCurrentTimeIndex(index);
    setTimePickerOpen(true);
  };

  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? "AM" : "PM";
        const displayTime = `${displayHour}:${String(minute).padStart(
          2,
          "0"
        )} ${ampm}`;
        const storageTime = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}`;
        options.push({ display: displayTime, value: storageTime });
      }
    }
    return options;
  };

  // Convert time formats
  const timeStringToDisplay = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };

  const displayToTimeString = (displayTime) => {
    const timeOptions = generateTimeOptions();
    const option = timeOptions.find((opt) => opt.display === displayTime);
    return option ? option.value : "09:00";
  };

  // Handle time picker confirm
  const handleTimeConfirm = async () => {
    if (switchLoading) return;

    try {
      setTimeLoading(true);
      const timeString = displayToTimeString(selectedTime);
      const newTimes = [...alertTimes];

      if (currentTimeIndex < newTimes.length) {
        newTimes[currentTimeIndex] = timeString;
      } else {
        newTimes.push(timeString);
      }

      const uniqueTimes = [...new Set(newTimes)].sort();
      let userTimezone = getUserTimezoneWithFallback();

      await facilityAlertsService.updateAlertTimes(
        user.uid,
        facilityId,
        uniqueTimes,
        userTimezone
      );

      setTimePickerOpen(false);
      onAlertsChange?.();
    } catch (error) {
      console.error("Error updating time:", error);
      alert("Failed to update alert time. Please try again.");
    } finally {
      setTimeLoading(false);
    }
  };

  // Handle removing time
  const handleRemoveTime = async (index) => {
    if (switchLoading) return;

    try {
      setDeletingTimeIndex(index);
      const newTimes = alertTimes.filter((_, i) => i !== index);
      let userTimezone = getUserTimezoneWithFallback();

      await facilityAlertsService.updateAlertTimes(
        user.uid,
        facilityId,
        newTimes,
        userTimezone
      );

      onAlertsChange?.();
    } catch (error) {
      console.error("Error removing time:", error);
      alert("Failed to remove alert time. Please try again.");
    } finally {
      setDeletingTimeIndex(null);
    }
  };

  // Show minimal skeleton while loading
  if (alertSettings === null) {
    return (
      <Skeleton
        variant="rectangular"
        width="100%"
        height={38}
        sx={{ borderRadius: 1, mb: 1 }}
      />
    );
  }

  return (
    <>
      {/* Alert Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={isAlertsEnabled}
            onChange={handleAlertToggle}
            color="primary"
            disabled={switchLoading}
          />
        }
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {isAlertsEnabled ? (
              <NotificationsRounded
                color={switchLoading ? "disabled" : "primary"}
                fontSize="small"
              />
            ) : (
              <NotificationsOffRounded color="disabled" fontSize="small" />
            )}
            <Typography
              variant="body2"
              color={switchLoading ? "text.disabled" : "text.primary"}
            >
              Send Update Reminders
            </Typography>
          </Box>
        }
        disabled={switchLoading}
      />

      {switchLoading && <CircularProgress size={14} sx={{ ml: 1 }} />}

      {/* Alert Times Display */}
      {isAlertsEnabled && (
        <Box sx={{ mt: 2 }}>
          {/* Time Chips */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {alertTimes.map((time, index) => {
              const isDeleting = deletingTimeIndex === index;
              return (
                <Chip
                  key={index}
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <AccessTimeRounded fontSize="inherit" />
                      {facilityAlertsService.formatTimeForDisplay(time)}
                    </Box>
                  }
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() =>
                    !timeLoading &&
                    !isDeleting &&
                    !switchLoading &&
                    handleEditTime(index)
                  }
                  onDelete={() => {
                    if (!timeLoading && !isDeleting && !switchLoading) {
                      handleRemoveTime(index);
                    }
                  }}
                  deleteIcon={
                    isDeleting ? (
                      <CircularProgress size={16} sx={{ color: "inherit" }} />
                    ) : undefined
                  }
                  disabled={timeLoading || isDeleting || switchLoading}
                  sx={{
                    cursor:
                      timeLoading || isDeleting || switchLoading
                        ? "default"
                        : "pointer",
                  }}
                />
              );
            })}

            {alertTimes.length < 24 && (
              <Tooltip
                title={
                  timeLoading || deletingTimeIndex !== null || switchLoading
                    ? "Processing..."
                    : "Add another time"
                }
              >
                <Chip
                  label="Add Time"
                  size="small"
                  variant="outlined"
                  color="secondary"
                  icon={<AddRounded />}
                  onClick={() =>
                    !timeLoading &&
                    deletingTimeIndex === null &&
                    !switchLoading &&
                    handleAddTime()
                  }
                  disabled={
                    timeLoading || deletingTimeIndex !== null || switchLoading
                  }
                  sx={{
                    cursor:
                      timeLoading || deletingTimeIndex !== null || switchLoading
                        ? "default"
                        : "pointer",
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {/* Help text */}
          {alertTimes.length === 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic", display: "block", lineHeight: 1.5 }}
            >
              Add a time to receive reminders to update your current estimate,
              or choose a schedule below.
            </Typography>
          )}

          {/* Quick setup buttons */}
          {alertTimes.length === 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {facilityAlertsService.getPresetOptions().map((preset, index) => (
                <Chip
                  key={index}
                  label={preset.label}
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={async () => {
                    if (timeLoading || switchLoading) return;
                    try {
                      setTimeLoading(true);
                      let userTimezone = getUserTimezoneWithFallback();
                      await facilityAlertsService.updateAlertTimes(
                        user.uid,
                        facilityId,
                        preset.times,
                        userTimezone
                      );
                      onAlertsChange?.();
                    } catch (error) {
                      console.error("Error setting preset times:", error);
                      alert("Failed to set preset times. Please try again.");
                    } finally {
                      setTimeLoading(false);
                    }
                  }}
                  disabled={timeLoading || switchLoading}
                  sx={{
                    cursor:
                      timeLoading || switchLoading ? "default" : "pointer",
                    fontSize: "0.7rem",
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Time Picker Dialog */}
      <Dialog
        open={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {currentTimeIndex < alertTimes.length ? "Edit Time" : "Add Time"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {currentTimeIndex < alertTimes.length
              ? `Edit reminder time for ${capitalize(facilityName)}.`
              : `Add a new reminder time for ${capitalize(facilityName)}.`}
          </DialogContentText>

          <FormControl fullWidth>
            <InputLabel>Time</InputLabel>
            <Select
              value={selectedTime}
              label="Time"
              onChange={(e) => setSelectedTime(e.target.value)}
              MenuProps={{
                PaperProps: { style: { maxHeight: 300 } },
              }}
            >
              {generateTimeOptions().map((option) => (
                <MenuItem key={option.value} value={option.display}>
                  {option.display}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DialogContentText variant="body2" sx={{ mt: 1 }}>
            Your current timezone is {getUserTimezoneWithFallback()}.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimePickerOpen(false)}>Cancel</Button>
          <LoadingButton
            onClick={handleTimeConfirm}
            loading={timeLoading}
            variant="contained"
            disabled={timeLoading}
          >
            {currentTimeIndex < alertTimes.length ? "Update Time" : "Add Time"}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Phone Verification Dialog */}
      <Dialog
        open={phoneVerifyDialogOpen}
        onClose={() => setPhoneVerifyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Phone Verification Required</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ marginBottom: 2 }}>
            Please verify your phone number in order to receive update
            reminders.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhoneVerifyDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setPhoneVerifyDialogOpen(false);
              window.location.href = "/dashboard/settings?tab=phone";
            }}
            sx={{ bgcolor: "#1b4584", "&:hover": { bgcolor: "#153a6d" } }}
          >
            Verify Phone Number
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FacilityAlerts;
