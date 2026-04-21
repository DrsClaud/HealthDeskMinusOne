import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  Collapse,
  DialogContentText,
} from "@mui/material";
import {
  EditRounded,
  DeleteRounded,
  MedicationRounded,
  ExpandMoreRounded,
  LocalFireDepartmentRounded,
  NotificationsRounded,
  NotificationsOffRounded,
} from "@mui/icons-material";
import ConfirmDialog from "components/common/ConfirmDialog";
import MedicationAlerts from "./MedicationAlerts";
import MedicationHabitTracker from "../medicationprogress/MedicationHabitTracker";
// import { adherenceAnalyticsService } from '../../services/adherenceAnalyticsService';
// import AnalogTimePicker from './AnalogTimePicker';
// import * as Sentry from '@sentry/browser';
// import { getCachedUserTimezone } from '../../utils/timezoneUtils';

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: "rotate(0deg)",
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: "rotate(180deg)",
      },
    },
  ],
}));

// Reusable badge components
const MedicationBadges = ({
  medication,
  optimisticReminderStatus,
  streakData,
  sx = {},
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ...sx }}>
    {/* Verified Badge */}
    {medication.rxcui && (
      <Chip
        label="Verified"
        size="small"
        color="success"
        variant="outlined"
        sx={{ fontSize: "0.7rem" }}
      />
    )}

    {/* TODO: Notification Status Chip disabled until Twilio BAA is in place */}
    {/* <Chip
      icon={
        optimisticReminderStatus?.enabled ? (
          <NotificationsRounded sx={{ fontSize: 14 }} />
        ) : (
          <NotificationsOffRounded sx={{ fontSize: 14 }} />
        )
      }
      label={optimisticReminderStatus?.enabled ? "Alerts On" : "Alerts Off"}
      size="small"
      color={optimisticReminderStatus?.enabled ? "primary" : "default"}
      variant="outlined"
      sx={{
        fontSize: "0.7rem",
        height: 24,
        "& .MuiChip-icon": {
          fontSize: 14,
        },
      }}
    /> */}

    {/* Streak Badge */}
    {streakData?.currentStreak > 0 && (
      <Chip
        icon={<LocalFireDepartmentRounded />}
        label={streakData.currentStreak}
        size="small"
        color="warning"
        variant="filled"
        sx={{
          fontSize: "0.75rem",
          height: 24,
        }}
      />
    )}
  </Box>
);

const MedicationCard = ({
  medication,
  reminderStatus,
  trackingSummary,
  onEdit,
  onDelete,
  onAdherenceChange,
  canEnableMoreAlerts = true,
}) => {
  const [loading, setLoading] = useState(false); // For switch toggle operations
  const [switchLoading, setSwitchLoading] = useState(false); // Track switch operations
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Optimistic reminder status - starts with prop value, updates immediately on toggle
  const [optimisticReminderStatus, setOptimisticReminderStatus] =
    useState(reminderStatus);

  // Update optimistic status when real prop changes
  React.useEffect(() => {
    if (reminderStatus) {
      setOptimisticReminderStatus(reminderStatus);
    }
  }, [reminderStatus]);

  // Extract tracking data from prop
  const adherenceData = trackingSummary?.adherenceData || null;
  const streakData = trackingSummary?.streakData || null;
  const badges = trackingSummary?.badges || [];

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Get 7-day data from Auth context - simple and clean
  const get7DayData = () => {
    // We'll add this prop to get tracking data from parent
    return trackingSummary?.last7Days || [];
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await onDelete(medication);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting medication:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card
        sx={{
          transition: "all 0.2s ease-in-out",
        }}
      >
        <CardHeader
          sx={{
            alignItems: "flex-start",
            pb: 1,
          }}
          avatar={
            <MedicationRounded
              sx={{
                bgcolor: "primary.main",
                color: "white",
                borderRadius: "50%",
                p: 0.6,
                fontSize: 22,
                width: 30,
                height: 30,
                mt: 0.5,
              }}
            />
          }
          title={
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              {/* Medication Name */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  color: "primary.main",
                  flex: "1 1 auto",
                  minWidth: 0,
                }}
              >
                {medication.name}
              </Typography>

              {/* All Badges Group - Hidden on mobile */}
              <MedicationBadges
                medication={medication}
                optimisticReminderStatus={optimisticReminderStatus}
                streakData={streakData}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  flexShrink: 0,
                }}
              />
            </Box>
          }
          subheader={
            <Box>
              <Typography variant="body2" color="text.secondary">
                Added by Patient on{" "}
                {medication.createdAt?.toLocaleDateString() || "Unknown date"}
              </Typography>

              {/* Mobile Badges - Show under subheader on small screens */}
              <MedicationBadges
                medication={medication}
                optimisticReminderStatus={optimisticReminderStatus}
                streakData={streakData}
                sx={{
                  display: { xs: "flex", sm: "none" },
                  mt: 1,
                }}
              />
            </Box>
          }
        />

        <CardActions disableSpacing>
          <IconButton
            onClick={() => onEdit(medication)}
            aria-label="edit medication"
            disabled={deleteLoading}
          >
            <EditRounded />
          </IconButton>
          <IconButton
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="delete medication"
            disabled={deleteLoading}
          >
            <DeleteRounded />
          </IconButton>
          <ExpandMore
            expand={expanded}
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreRounded />
          </ExpandMore>
        </CardActions>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent>
            {/* Medication Details Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Medication Details
              </Typography>

              {/* Dosage & Frequency */}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Dosage:</strong> {medication.dosage || "Not specified"}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Frequency:</strong>{" "}
                {medication.frequency || "As needed"}
              </Typography>

              {/* Prescriber & Pharmacy */}
              {medication.prescribedBy && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Prescribed by:</strong> {medication.prescribedBy}
                </Typography>
              )}

              {medication.pharmacy && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Pharmacy:</strong> {medication.pharmacy}
                </Typography>
              )}

              {/* Notes */}
              {medication.notes && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Notes:</strong> {medication.notes}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Alert Settings Section */}
            <MedicationAlerts
              medication={medication}
              reminderStatus={reminderStatus}
              optimisticReminderStatus={optimisticReminderStatus}
              setOptimisticReminderStatus={setOptimisticReminderStatus}
              onAdherenceChange={onAdherenceChange}
              loading={loading}
              setLoading={setLoading}
              switchLoading={switchLoading}
              setSwitchLoading={setSwitchLoading}
              trackingSummary={trackingSummary}
            />

            {/* Recent Tracking Section */}
            <MedicationHabitTracker
              medications={[medication]}
              calendarDataByMedication={
                new Map([
                  [medication.id, { dailyData: get7DayData(), isEmpty: false }],
                ])
              }
              loading={false}
              compact={true}
              singleMedicationId={medication.id}
              alertsEnabled={optimisticReminderStatus?.enabled}
            />

            {/* Simple Streak Summary */}
            {streakData && streakData.currentStreak > 0 && (
              <Box sx={{ mt: 1, textAlign: "left" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.75rem",
                    lineHeight: 1.2,
                    opacity: 0.8,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <LocalFireDepartmentRounded
                    sx={{ fontSize: "0.9rem", color: "warning.main" }}
                  />
                  You've taken this medication {streakData.currentStreak} day
                  {streakData.currentStreak !== 1 ? "s" : ""} in a row.
                  {streakData.bestStreak > 0 &&
                    streakData.bestStreak !== streakData.currentStreak && (
                      <span>
                        {" "}
                        Your best streak is {streakData.bestStreak} days.
                      </span>
                    )}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Collapse>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        title="Delete Medication"
        message={
          <Box>
            <DialogContentText sx={{ mb: 2 }}>
              Are you sure you want to delete <strong>{medication.name}</strong>
              ?
            </DialogContentText>
            <DialogContentText>
              This action cannot be undone. All medication history and reminders
              will be permanently removed.
            </DialogContentText>
          </Box>
        }
        confirmLabel="Delete Medication"
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        confirmColor="error"
      />
    </>
  );
};

export default MedicationCard;
