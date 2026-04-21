import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import {
  AccessTimeRounded,
  AddRounded,
  NotificationsRounded,
  NotificationsOffRounded,
} from "@mui/icons-material";
import { useAuth } from "../../../hooks/useAuth";
import { adherenceService } from "../../../services/adherenceService";
import { getUserTimezoneWithFallback } from "../../../utils/timezoneUtils";

const MedicationAlerts = ({
  medication,
  reminderStatus,
  optimisticReminderStatus,
  setOptimisticReminderStatus,
  onAdherenceChange,
  loading,
  setLoading,
  switchLoading,
  setSwitchLoading,
  trackingSummary,
}) => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [timeLoading, setTimeLoading] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [phoneVerifyDialogOpen, setPhoneVerifyDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("8:00 AM");
  const [deletingTimeIndex, setDeletingTimeIndex] = useState(null);

  const isAlertsEnabled = optimisticReminderStatus?.enabled;
  const alertTimes = optimisticReminderStatus?.times || [];

  // Extract tracking data from prop
  const adherenceData = trackingSummary?.adherenceData || null;
  const streakData = trackingSummary?.streakData || null;
  const badges = trackingSummary?.badges || [];

  // No longer need to load reminder status - it's passed as a prop

  // Format time for display
  const formatTimeForDisplay = (time) => {
    return adherenceService.formatTimeForDisplay(time);
  };

  // Handle alert toggle with proper concurrency protection
  const handleAlertToggle = async (event) => {
    const enabled = event.target.checked;

    // Prevent concurrent operations
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

      // Get user's timezone - use actual browser timezone instead of hardcoded NY
      // ALWAYS use detected timezone, don't trust old stored values
      let userTimezone = getUserTimezoneWithFallback();

      // Store original state for potential rollback
      const originalState = { ...optimisticReminderStatus };

      // Optimistic UI: Update parent's state immediately
      setOptimisticReminderStatus((prev) => ({
        ...prev,
        enabled: true,
        timezone: userTimezone,
      }));

      try {
        setSwitchLoading(true);

        // Enable reminders with current times and timezone
        await adherenceService.enableReminders(
          medication.id,
          optimisticReminderStatus?.times || [],
          userTimezone
        );

        // Trigger callback to parent component
        onAdherenceChange?.();
      } catch (error) {
        console.error("Error enabling adherence:", error);
        // Revert optimistic update on failure
        setOptimisticReminderStatus(originalState);
        // Show user-friendly error message
        alert("Failed to enable medication reminders. Please try again.");
      } finally {
        setSwitchLoading(false);
      }
    } else {
      // Store original state for potential rollback
      const originalState = { ...optimisticReminderStatus };

      // Optimistic UI: Update parent's state immediately
      setOptimisticReminderStatus((prev) => ({
        ...prev,
        enabled: false,
      }));

      try {
        setSwitchLoading(true);

        // Disable reminders
        await adherenceService.disableReminders(medication.id);

        // Trigger callback to parent component
        onAdherenceChange?.();
      } catch (error) {
        console.error("Error disabling adherence:", error);
        // Revert optimistic update on failure
        setOptimisticReminderStatus(originalState);
        // Show user-friendly error message
        alert("Failed to disable medication reminders. Please try again.");
      } finally {
        setSwitchLoading(false);
      }
    }
  };

  // Handle adding new time
  const handleAddTime = () => {
    if (alertTimes.length >= 24) return; // Max 24 times per day
    if (switchLoading || timeLoading) return; // Prevent during switch operations

    // Set default time to 8:00 AM
    setSelectedTime("8:00 AM");

    setCurrentTimeIndex(alertTimes.length);
    setTimePickerOpen(true);
  };

  // Handle editing existing time
  const handleEditTime = (index) => {
    if (switchLoading || timeLoading) return; // Prevent during switch operations

    // Set dropdown value based on existing time
    const displayTime = timeStringToDisplay(alertTimes[index]);
    setSelectedTime(displayTime);

    setCurrentTimeIndex(index);
    setTimePickerOpen(true);
  };

  // Generate all time options in 15-minute intervals (Google Calendar style)
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

  // Convert 24-hour time to 12-hour display format
  const timeStringToDisplay = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };

  // Convert 12-hour display format to 24-hour time
  const displayToTimeString = (displayTime) => {
    const timeOptions = generateTimeOptions();
    const option = timeOptions.find((opt) => opt.display === displayTime);
    return option ? option.value : "08:00";
  };

  // Handle time picker confirm
  const handleTimeConfirm = async () => {
    if (switchLoading) return; // Prevent during switch operations

    try {
      setTimeLoading(true);

      // Convert display time to 24-hour time string
      const timeString = displayToTimeString(selectedTime);

      const newTimes = [...alertTimes];

      if (currentTimeIndex < newTimes.length) {
        // Edit existing time
        newTimes[currentTimeIndex] = timeString;
      } else {
        // Add new time
        newTimes.push(timeString);
      }

      // Sort times chronologically and remove duplicates
      const uniqueTimes = [...new Set(newTimes)].sort();

      // Get user's timezone for time updates - ALWAYS use detected timezone
      let userTimezone = getUserTimezoneWithFallback();

      // Update reminder times via service
      await adherenceService.updateReminderTimes(
        medication.id,
        uniqueTimes,
        userTimezone
      );

      // Update optimistic state in parent
      setOptimisticReminderStatus((prev) => ({
        ...prev,
        times: uniqueTimes,
        timezone: userTimezone,
      }));

      setTimePickerOpen(false);
      onAdherenceChange?.();
    } catch (error) {
      console.error("Error updating time:", error);
      alert("Failed to update reminder time. Please try again.");
    } finally {
      setTimeLoading(false);
    }
  };

  // Handle removing time
  const handleRemoveTime = async (index) => {
    if (switchLoading) return; // Prevent during switch operations

    try {
      setDeletingTimeIndex(index);

      const newTimes = alertTimes.filter((_, i) => i !== index);

      // Get user's timezone for time updates - ALWAYS use detected timezone
      let userTimezone = getUserTimezoneWithFallback();

      // Update reminder times via service (even if empty array)
      await adherenceService.updateReminderTimes(
        medication.id,
        newTimes,
        userTimezone
      );

      // Update optimistic state in parent (keeping alerts enabled even with no times)
      setOptimisticReminderStatus((prev) => ({
        ...prev,
        times: newTimes,
        timezone: userTimezone,
      }));

      onAdherenceChange?.();
    } catch (error) {
      console.error("Error removing time:", error);
      alert("Failed to remove reminder time. Please try again.");
    } finally {
      setDeletingTimeIndex(null);
    }
  };

  // Handle time picker close/cancel
  const handleTimePickerClose = () => {
    setTimePickerOpen(false);
  };

  // SMS alerts UI removed from render until Twilio HIPAA BAA — restore loading skeleton + block below when re-enabling
  if (reminderStatus === null) {
    return null;
  }

  return (
    <>
      {/* SMS ALERTS UI — disabled until Twilio BAA is signed
        Loading skeleton (when reminderStatus === null):
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Alert Settings
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton variant="rectangular" width={48} height={24} sx={{ borderRadius: 3 }} />
            <Skeleton variant="text" width={120} />
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Alert Settings
          </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    <NotificationsOffRounded
                      color="disabled"
                      fontSize="small"
                    />
                  )}
                  <Typography
                    variant="body2"
                    color={switchLoading ? "text.disabled" : "text.primary"}
                  >
                    Send Alerts
                  </Typography>
                </Box>
              }
              disabled={switchLoading}
            />
            {(loading || switchLoading) && (
              <CircularProgress size={14} sx={{ ml: 0.5 }} />
            )}
          </Box>
        </Box>

        {isAlertsEnabled && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {alertTimes.map((time, index) => {
                const isDeleting = deletingTimeIndex === index;
                return (
                  <Chip
                    key={index}
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        {formatTimeForDisplay(time)}
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
                      "& .MuiChip-deleteIcon": {
                        opacity:
                          timeLoading || isDeleting || switchLoading ? 0.5 : 1,
                      },
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
                        timeLoading ||
                        deletingTimeIndex !== null ||
                        switchLoading
                          ? "default"
                          : "pointer",
                    }}
                  />
                </Tooltip>
              )}
            </Box>

            {alertTimes.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block", fontStyle: "italic" }}
              >
                Add a time to receive reminders.
              </Typography>
            )}
          </Box>
        )}
        </Box>
        END SMS ALERTS UI */}

      {/* SMS DIALOGS — disabled until Twilio BAA is signed
      <Dialog
        open={timePickerOpen}
        onClose={handleTimePickerClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {currentTimeIndex < alertTimes.length ? "Edit Time" : "Add Time"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {currentTimeIndex < alertTimes.length
              ? `Edit reminder time for ${medication.name}.`
              : `Add a new reminder time for ${medication.name}.`}
          </DialogContentText>

          <FormControl fullWidth>
            <InputLabel>Time</InputLabel>
            <Select
              value={selectedTime}
              label="Time"
              onChange={(e) => setSelectedTime(e.target.value)}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                  },
                },
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
          <Button onClick={handleTimePickerClose}>Cancel</Button>
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

      <Dialog
        open={phoneVerifyDialogOpen}
        onClose={() => setPhoneVerifyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Phone Verification Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please verify your phone number in order to receive medication
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
              navigate("/dashboard/settings?tab=phone");
            }}
            sx={{ bgcolor: "#1b4584", "&:hover": { bgcolor: "#153a6d" } }}
          >
            Verify Phone Number
          </Button>
        </DialogActions>
      </Dialog>
      END SMS DIALOGS */}
    </>
  );
};

export default MedicationAlerts;
