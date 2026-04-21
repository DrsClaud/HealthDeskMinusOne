import React from "react";
import { Alert, Typography, Box, Button } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import MedicationList from "components/individual/medications/MedicationList";
import MedicationForm from "components/individual/medications/MedicationForm";
import { useAuth } from "hooks/useAuth";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const MedicationsPage = () => {
  const {
    medications,
    reminderStatuses,
    medicationsLoading,
    addMedication,
    updateMedication,
    deleteMedication,
    refreshReminderStatuses,
    trackingData,
    loadTrackingData,
  } = useAuth();
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedMedication, setSelectedMedication] = React.useState(null);

  // Load tracking data when first needed - now loads for ALL medications
  React.useEffect(() => {
    if (
      medications.length > 0 &&
      !trackingData.loaded &&
      !trackingData.loading
    ) {
      loadTrackingData();
    }
  }, [
    medications.length,
    trackingData.loaded,
    trackingData.loading,
    loadTrackingData,
  ]);

  // Create tracking summaries for each medication from full data
  const trackingSummaries = React.useMemo(() => {
    const summaries = new Map();

    if (trackingData.loaded && trackingData.calendarDataByMedication) {
      trackingData.calendarDataByMedication.forEach((data, medId) => {
        // Calculate individual medication streak data
        const daysWithData =
          data.dailyData
            ?.filter(
              (day) => day.isRealTrackingDay && day.expectedReminders > 0
            )
            .sort((a, b) => new Date(a.date) - new Date(b.date)) || [];

        // Calculate current streak (from most recent day backwards)
        let currentStreak = 0;
        const reverseDays = [...daysWithData].reverse();
        for (const day of reverseDays) {
          if (day.adherenceRate >= 1.0) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate all consecutive streaks throughout history
        const allConsecutiveStreaks = [];
        let currentConsecutiveStreak = 0;

        for (const day of daysWithData) {
          if (day.adherenceRate >= 1.0) {
            currentConsecutiveStreak++;
          } else {
            if (currentConsecutiveStreak > 0) {
              allConsecutiveStreaks.push(currentConsecutiveStreak);
              currentConsecutiveStreak = 0;
            }
          }
        }
        // Don't forget the last streak if the data ends on a perfect day
        if (currentConsecutiveStreak > 0) {
          allConsecutiveStreaks.push(currentConsecutiveStreak);
        }

        const bestStreak =
          allConsecutiveStreaks.length > 0
            ? Math.max(...allConsecutiveStreaks)
            : 0;

        summaries.set(medId, {
          last7Days: data.last7Days || [],
          streakData: {
            currentStreak,
            bestStreak,
            allConsecutiveStreaks,
          },
          adherenceData: {
            // Add any other adherence data needed
          },
        });
      });
    }

    return summaries;
  }, [trackingData]);

  // Handlers for medication CRUD operations
  const handleAddMedication = async (medication) => {
    try {
      await addMedication(medication);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error adding medication:", error);
      setError("Failed to add medication");
    }
  };

  const handleEditMedication = (medication) => {
    setSelectedMedication(medication);
    setFormOpen(true);
  };

  const handleUpdateMedication = async (updatedMedication) => {
    try {
      await updateMedication(updatedMedication.id, updatedMedication);
      setSelectedMedication(null);
      setFormOpen(false);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error updating medication:", error);
      setError("Failed to update medication");
    }
  };

  const handleDeleteMedication = async (medication) => {
    try {
      await deleteMedication(medication.id);
      setError(null);
      setSuccessMsg(`Removed "${medication.name}" from your list.`);
    } catch (err) {
      console.error("Error deleting medication:", err);
      setError("Failed to delete medication");
      throw err;
    }
  };

  // Handle adherence changes - refresh reminder statuses
  const handleAdherenceChange = async () => {
    try {
      await refreshReminderStatuses();
    } catch (error) {
      console.error("Error refreshing reminder statuses:", error);
    }
  };

  return (
    <div className="inner">
      <DashboardPageHeader
        title="My Medications"
        subtitle="Manage your medications."
        actions={
          <Button
            variant="contained"
            onClick={() => {
              setSelectedMedication(null);
              setFormOpen(true);
            }}
            startIcon={<AddRounded />}
            sx={{ bgcolor: "#1b4584", "&:hover": { bgcolor: "#153a6d" } }}
          >
            Add Medication
          </Button>
        }
      />

      {successMsg ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      ) : null}

      <MedicationList
        medications={medications}
        reminderStatuses={reminderStatuses}
        loading={medicationsLoading}
        error={error}
        onEdit={handleEditMedication}
        onDelete={handleDeleteMedication}
        onAdherenceChange={handleAdherenceChange}
        canEnableMoreAlerts={true}
        trackingSummaries={trackingSummaries}
        trackingLoading={trackingData.loading}
      />

      {formOpen && (
        <MedicationForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setSelectedMedication(null);
          }}
          onSave={
            selectedMedication ? handleUpdateMedication : handleAddMedication
          }
          medication={selectedMedication}
          isEdit={!!selectedMedication}
        />
      )}
    </div>
  );
};

export default MedicationsPage;
