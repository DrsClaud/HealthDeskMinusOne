import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { CalendarTodayRounded, WarningAmberRounded } from "@mui/icons-material";
import MedicationHabitTracker from "./MedicationHabitTracker";
import MedicationTrackingData from "./MedicationTrackingData";

const MedicationTrackingDashboard = ({
  // Overview mode props
  summary,
  medications = [],
  calendarDataByMedication = new Map(),
  loading = false,
  dataProcessing = false, // New prop for when tracking data is being processed

  // Single medication mode props
  selectedMedicationId = null,
  showOverviewStats = false,
  title = "Daily Tracking Calendar",
}) => {
  // Progress color helper function
  const getProgressColor = (score) => {
    if (score >= 85) return "success";
    if (score >= 70) return "primary";
    if (score >= 50) return "warning";
    return "error";
  };
  const [medicationId, setMedicationId] = useState(
    selectedMedicationId ||
      (showOverviewStats ? null : medications[0]?.id || "")
  );
  const [weeklyInsights, setWeeklyInsights] = useState(null);

  // Determine if we're in overview mode (aggregated) or single medication mode
  const isOverviewMode = showOverviewStats || !medicationId;

  useEffect(() => {
    if (!isOverviewMode && medicationId) {
      calculateWeeklyInsights();
    } else {
      setWeeklyInsights(null);
    }
  }, [medicationId, calendarDataByMedication, isOverviewMode]);

  const calculateWeeklyInsights = () => {
    if (!medicationId || !calendarDataByMedication.has(medicationId)) {
      setWeeklyInsights(null);
      return;
    }

    const data = calendarDataByMedication.get(medicationId);
    if (!data?.dailyData || data.isEmpty) {
      setWeeklyInsights(null);
      return;
    }

    const dayOfWeekStats = Array(7)
      .fill(0)
      .map(() => ({ taken: 0, missed: 0, total: 0 }));
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    data.dailyData.forEach((day) => {
      const dayOfWeek = new Date(day.date).getDay();
      dayOfWeekStats[dayOfWeek].total++;
      if (day.status === "taken") {
        dayOfWeekStats[dayOfWeek].taken++;
      } else if (day.status === "missed") {
        dayOfWeekStats[dayOfWeek].missed++;
      }
    });

    // Find best and worst days
    let bestDay = { index: 0, rate: 0 };
    let worstDay = { index: 0, rate: 100 };

    dayOfWeekStats.forEach((stats, index) => {
      if (stats.total > 0) {
        const adherenceRate = (stats.taken / stats.total) * 100;
        if (adherenceRate > bestDay.rate) {
          bestDay = { index, rate: adherenceRate };
        }
        if (adherenceRate < worstDay.rate && adherenceRate < 100) {
          worstDay = { index, rate: adherenceRate };
        }
      }
    });

    setWeeklyInsights({
      dayOfWeekStats,
      dayNames,
      bestDay:
        bestDay.rate > 0
          ? { name: dayNames[bestDay.index], rate: bestDay.rate }
          : null,
      worstDay:
        worstDay.rate < 100
          ? { name: dayNames[worstDay.index], rate: worstDay.rate }
          : null,
    });
  };

  // Generate aggregated calendar data for overview mode
  const generateAggregatedData = () => {
    if (
      !isOverviewMode ||
      medications.length === 0 ||
      calendarDataByMedication.size === 0
    ) {
      return null;
    }

    // Collect all daily data from all medications - count actual DOSES, not medications
    const allDailyData = new Map(); // date -> { taken: number, total: number }
    let totalMedications = 0;

    medications.forEach((med) => {
      const medData = calendarDataByMedication.get(med.id);
      if (medData && !medData.isEmpty && medData.dailyData) {
        totalMedications++;
        medData.dailyData.forEach((day) => {
          const dateKey = day.date;
          if (!allDailyData.has(dateKey)) {
            allDailyData.set(dateKey, { taken: 0, total: 0 });
          }

          const dayData = allDailyData.get(dateKey);

          // Include ALL days for heatmap display, but only count real tracking data
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

    if (allDailyData.size === 0) return null;

    // Convert to array and sort by date
    const sortedData = Array.from(allDailyData.entries())
      .map(([date, data]) => ({
        date,
        taken: data.taken,
        total: data.total,
        adherenceRate: data.total > 0 ? data.taken / data.total : 0,
        status:
          data.taken === data.total
            ? "perfect"
            : data.taken > 0
            ? "partial"
            : "none",
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      dailyData: sortedData,
      totalMedications,
      totalDays: sortedData.length,
    };
  };

  // Generate single medication data
  const getSingleMedicationData = () => {
    if (
      isOverviewMode ||
      !medicationId ||
      !calendarDataByMedication.has(medicationId)
    ) {
      return null;
    }

    const data = calendarDataByMedication.get(medicationId);
    if (!data || data.isEmpty || !data.dailyData) {
      return null;
    }

    return {
      dailyData: data.dailyData.map((day) => ({
        ...day,
        adherenceRate: day.status === "taken" ? 1 : 0,
      })),
      medicationName: data.medicationName,
      summary: data.summary,
    };
  };

  // Show loading spinner when data is being loaded or processed
  if (
    loading ||
    dataProcessing ||
    (showOverviewStats && !summary && medications.length > 0) ||
    (showOverviewStats &&
      medications.length > 0 &&
      calendarDataByMedication.size === 0)
  ) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Get the appropriate data source
  const dataSource = isOverviewMode
    ? generateAggregatedData()
    : getSingleMedicationData();

  // Calculate RECENT performance - fair for new users
  let thisWeekTaken = 0;
  let thisWeekTotal = 0;
  let timeframeLabel = "Past Week";

  if (isOverviewMode && dataSource) {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6); // 6 days ago = 7 days total (including today)
    oneWeekAgo.setHours(0, 0, 0, 0); // Start of 6 days ago

    // Find the first entry date
    const firstEntryDate =
      dataSource.dailyData.length > 0
        ? new Date(
            Math.min(...dataSource.dailyData.map((day) => new Date(day.date)))
          )
        : now;
    firstEntryDate.setHours(0, 0, 0, 0);

    // Use the later of "one week ago" or "first entry date"
    const startDate = firstEntryDate > oneWeekAgo ? firstEntryDate : oneWeekAgo;

    // Update label if we're using a shorter timeframe
    const daysSinceStart = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    if (daysSinceStart < 7) {
      timeframeLabel =
        daysSinceStart === 1 ? "Today" : `Past ${daysSinceStart} Days`;
    }

    dataSource.dailyData
      .filter((day) => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate >= startDate && dayDate <= now;
      })
      .filter((day) => day.total > 0) // FIXED: Only include days with actual medications expected
      .forEach((day) => {
        thisWeekTaken += day.taken;
        thisWeekTotal += day.total;
      });
  }

  const thisWeekRate =
    thisWeekTotal > 0 ? Math.round((thisWeekTaken / thisWeekTotal) * 100) : 0;

  const renderContent = () => (
    <Box>
      {/* Header with optional medication selector */}
      {!showOverviewStats && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <CalendarTodayRounded color="primary" />
            {title}
          </Typography>

          {/* Medication Selector - only show when not in overview mode and multiple medications */}
          {!isOverviewMode && medications.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Medication</InputLabel>
              <Select
                value={medicationId}
                onChange={(e) => setMedicationId(e.target.value)}
                label="Select Medication"
              >
                {medications.map((med) => (
                  <MenuItem key={med.id} value={med.id}>
                    {med.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      {/* Habit Tracker - Only show if we have actual adherence data (same condition as MedicationTrackingProgress) */}
      {summary && summary.averageAdherence > 0 && (
        <MedicationHabitTracker
          medications={medications}
          calendarDataByMedication={calendarDataByMedication}
          loading={loading}
          dataProcessing={dataProcessing}
        />
      )}

      {/* Adherence Percentage Summary - positioned after habit tracker */}
      {summary && summary.averageAdherence > 0 && (
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            You've taken{" "}
            <Typography
              component="span"
              variant="h5"
              color={getProgressColor(summary.averageAdherence) + ".main"}
              sx={{ fontWeight: 700 }}
            >
              {summary.averageAdherence}%
            </Typography>{" "}
            of your prescribed medications as scheduled.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.message}
          </Typography>
        </Box>
      )}

      {/* Get Started Card - when no tracking data */}
      {summary && summary.averageAdherence === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Ready to start tracking?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Reply to your first reminder SMS message to start tracking your
              medication adherence.
            </Typography>
            <Button
              component="a"
              href="/dashboard/medications"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Go to Medications
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <MedicationTrackingData
        summary={summary}
        dataSource={dataSource}
        isOverviewMode={isOverviewMode}
        showOverviewStats={showOverviewStats}
        thisWeekData={dataSource ? { thisWeekRate, timeframeLabel } : null}
        loading={loading}
        dataProcessing={dataProcessing}
      />

      {/* Weekly Insights - only for single medication mode */}
      {!isOverviewMode && weeklyInsights && (
        <Paper sx={{ p: 2, bgcolor: "info.50" }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <WarningAmberRounded color="info" />
            Weekly Patterns
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {weeklyInsights.bestDay && (
              <Chip
                label={`Best: ${weeklyInsights.bestDay.name} (${Math.round(
                  weeklyInsights.bestDay.rate
                )}%)`}
                color="success"
                size="small"
              />
            )}
            {weeklyInsights.worstDay && (
              <Chip
                label={`Toughest day: ${
                  weeklyInsights.worstDay.name
                } (${Math.round(
                  100 - weeklyInsights.worstDay.rate
                )}% miss rate)`}
                color="warning"
                size="small"
              />
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );

  // Wrap in Card if not showing overview stats (for consistency)
  return showOverviewStats ? (
    renderContent()
  ) : (
    <Card>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default MedicationTrackingDashboard;
