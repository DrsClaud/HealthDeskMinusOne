import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import MedicationTrackingDashboard from "components/individual/medicationprogress/MedicationTrackingDashboard";
import MedicationAdherenceCharts from "components/individual/medicationprogress/MedicationAdherenceCharts";
import { useAuth } from "hooks/useAuth";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const MedicationTrackingPage = () => {
  const {
    userData,
    medications,
    medicationsLoading,
    trackingData,
    loadTrackingData,
    forceResetTrackingData,
  } = useAuth();

  // Generate aggregated daily data for charts (same logic as MedicationTrackingDashboard)
  const generateAggregatedDailyData = (
    activeMedications,
    calendarDataByMedication
  ) => {
    if (!activeMedications.length || !calendarDataByMedication.size) {
      return [];
    }

    // Collect all daily data from all medications - count actual DOSES, not medications
    const allDailyData = new Map(); // date -> { taken: number, total: number }

    activeMedications.forEach((med) => {
      const medData = calendarDataByMedication.get(med.id);

      if (medData && !medData.isEmpty && medData.dailyData) {
        medData.dailyData.forEach((day) => {
          const dateKey = day.date;
          if (!allDailyData.has(dateKey)) {
            allDailyData.set(dateKey, { taken: 0, total: 0 });
          }

          const dayData = allDailyData.get(dateKey);

          // Include ALL days for chart display, but only count real tracking data
          const expectedDoses = day.isRealTrackingDay
            ? day.expectedReminders || 0
            : 0;
          const takenDoses =
            day.isRealTrackingDay && day.entries
              ? day.entries.filter((e) => e.status === "taken").length
              : 0;

          dayData.taken += takenDoses;
          dayData.total += expectedDoses;
        });
      }
    });

    if (allDailyData.size === 0) return [];

    // Convert to array and sort by date
    return Array.from(allDailyData.entries())
      .map(([date, data]) => ({
        date,
        taken: data.taken,
        total: data.total,
        adherenceRate: data.total > 0 ? data.taken / data.total : 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Load tracking data when first needed - now loads for ALL medications
  useEffect(() => {
    if (!userData?.uid || medicationsLoading) return;

    if (
      medications.length > 0 &&
      !trackingData.loaded &&
      !trackingData.loading
    ) {
      loadTrackingData();
    }
  }, [
    userData?.uid,
    medications.length,
    medicationsLoading,
    trackingData.loaded,
    trackingData.loading,
    loadTrackingData,
  ]);

  return (
    <div className="inner">
      <DashboardPageHeader
        title="Medication Tracking"
        subtitle={
          <>
            <Typography sx={{ display: "block", mb: 2 }}>
              Track how you're doing with your medications, view trends, and
              celebrate your progress over time.
            </Typography>
            {trackingData.dashboardSummary?.averageAdherence > 0 ? (
              <Typography sx={{ display: "block", mt: 1 }}>
                Need to adjust your medications or reminder frequency?{" "}
                <Link
                  to="/dashboard/medications"
                  style={{
                    color: "#1976d2",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                >
                  Manage your medications here
                </Link>
                .
              </Typography>
            ) : null}
          </>
        }
      />

      {/* Show loading until everything is ready */}
      {medicationsLoading || trackingData.loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : medications.filter((med) => med.adherence?.enabled).length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No Active Medication Reminders
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enable SMS reminders on your medications to start tracking
              adherence data.
            </Typography>
            <Button
              component={Link}
              to="/dashboard/medications"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Go to Medications
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Unified Calendar Overview */}
          <MedicationTrackingDashboard
            summary={trackingData.dashboardSummary}
            medications={medications.filter((med) => med.adherence?.enabled)}
            calendarDataByMedication={trackingData.calendarDataByMedication}
            loading={false}
            dataProcessing={false}
            showOverviewStats={true}
            title="Medication Tracking Overview"
          />

          {/* Adherence Charts - only show when we have tracking data */}
          {trackingData.dashboardSummary?.averageAdherence > 0 && (
            <MedicationAdherenceCharts
              dailyData={generateAggregatedDailyData(
                medications.filter((med) => med.adherence?.enabled),
                trackingData.calendarDataByMedication
              )}
              loading={false}
              dataProcessing={false}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MedicationTrackingPage;
