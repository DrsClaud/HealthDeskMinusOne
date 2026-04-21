import React from "react";
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import {
  CircleRounded,
  CheckCircleRounded,
  RadioButtonUncheckedRounded,
} from "@mui/icons-material";

const MedicationHabitTracker = ({
  medications = [],
  calendarDataByMedication = new Map(),
  loading = false,
  dataProcessing = false,
  daysBack, // Will be set dynamically based on screen size
  compact = false, // New: enables compact mode for single medication display
  singleMedicationId = null, // New: when provided, only shows this medication
  alertsEnabled = null, // New: when provided in compact mode, shows tracker based on alert status
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Generate the past N days
  const generateDays = () => {
    const days = [];
    const today = new Date();

    for (let i = actualDaysBack - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      days.push({
        date: dateString,
        dayOfWeek: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayOfMonth: date.getDate(),
        isToday: i === 0,
      });
    }

    return days;
  };

  // Get medication data for a specific day
  const getMedicationDayData = (medicationId, dateString) => {
    const medData = calendarDataByMedication.get(medicationId);
    if (!medData || !medData.dailyData) return null;

    return medData.dailyData.find((day) => day.date === dateString);
  };

  // Determine medication adherence status for a given day
  const getMedicationStatus = (medicationId, dateString) => {
    const dayData = getMedicationDayData(medicationId, dateString);
    if (!dayData) return "no-data"; // No data

    // For single medication tracking, check status
    if (dayData.status === "taken") return "complete";
    if (
      dayData.status === "good" ||
      dayData.status === "partial" ||
      dayData.status === "poor"
    )
      return "partial";
    if (dayData.status === "missed" || dayData.status === "skipped")
      return "missed";

    // For multi-dose medications, check adherence rate
    if (dayData.adherenceRate !== undefined) {
      if (dayData.adherenceRate === 1) return "complete";
      if (dayData.adherenceRate > 0) return "partial";
      return "missed";
    }

    // Check entries if available
    if (dayData.entries && dayData.entries.length > 0) {
      const takenCount = dayData.entries.filter(
        (entry) => entry.status === "taken"
      ).length;
      const totalExpected = dayData.expectedReminders || 1;

      if (takenCount === totalExpected) return "complete";
      if (takenCount > 0) return "partial";
      return "missed";
    }

    // If we have expectedReminders but no entries, that means 0 doses taken
    if (dayData.expectedReminders && dayData.expectedReminders > 0) {
      return "missed";
    }

    return "no-data"; // No clear data
  };

  // Get partial adherence text (e.g., "2/3")
  const getPartialText = (medicationId, dateString) => {
    const dayData = getMedicationDayData(medicationId, dateString);
    if (!dayData) return "";

    if (dayData.entries && dayData.entries.length > 0) {
      const takenCount = dayData.entries.filter(
        (entry) => entry.status === "taken"
      ).length;
      const totalExpected = dayData.expectedReminders || 1;
      return `${takenCount}/${totalExpected}`;
    }

    // Fallback for adherence rate
    if (
      dayData.adherenceRate !== undefined &&
      dayData.adherenceRate > 0 &&
      dayData.adherenceRate < 1
    ) {
      // Try to estimate from adherence rate - this is imperfect but better than nothing
      const estimated = Math.round(dayData.adherenceRate * 3); // Assume up to 3 doses max
      return `${estimated}/3`;
    }

    return "";
  };

  // Calculate adherence for a medication over the past N days
  const getMedicationAdherence = (
    medicationId,
    daysToCheck = actualDaysBack
  ) => {
    const medData = calendarDataByMedication.get(medicationId);
    if (!medData || !medData.dailyData) return { taken: 0, total: 0 };

    // Get the date range we want to check
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - (daysToCheck - 1));
    const startDateString = startDate.toISOString().split("T")[0];
    const todayString = today.toISOString().split("T")[0];

    let taken = 0;
    let total = 0;

    medData.dailyData
      .filter((day) => day.date >= startDateString && day.date <= todayString)
      .forEach((day) => {
        const expectedReminders = day.expectedReminders || 0;

        // Always count expected reminders in total, regardless of response status
        if (expectedReminders > 0) {
          total += expectedReminders;

          if (day.entries && day.entries.length > 0) {
            const takenCount = day.entries.filter(
              (entry) => entry.status === "taken"
            ).length;
            taken += takenCount;
          } else if (day.status === "taken") {
            // For single-dose medications without entries
            taken += 1;
          }
        }
      });

    return { taken, total };
  };

  // Get progress summary for compact mode
  const getProgressSummary = (medicationId) => {
    const adherence = getMedicationAdherence(medicationId, actualDaysBack);
    if (adherence.total === 0) return null; // Don't show anything when no data

    const timeframe = compact ? "week" : `${actualDaysBack} days`;
    return `You've taken ${adherence.taken}/${adherence.total} doses this past ${timeframe}.`;
  };

  // Get concise tooltip text for a medication on a specific day
  const getTooltipText = (medicationId, dateString) => {
    const dayData = getMedicationDayData(medicationId, dateString);
    const medication = medications.find((med) => med.id === medicationId);
    const medName = medication?.name || "Medication";

    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    if (!dayData) {
      return `No data for ${medName} on ${formattedDate}`;
    }

    const entries = dayData.entries || [];
    const expectedReminders = dayData.expectedReminders || 1;

    // If we have no expectedReminders, it means this medication wasn't tracked this day
    if (!expectedReminders || expectedReminders === 0) {
      return `No data for ${medName} on ${formattedDate}`;
    }

    const takenCount = entries.filter((e) => e.status === "taken").length;

    if (expectedReminders === 1) {
      return takenCount === 1
        ? `${medName} taken on ${formattedDate}`
        : `${medName} not taken on ${formattedDate}`;
    } else {
      return `${takenCount}/${expectedReminders} doses of ${medName} taken on ${formattedDate}`;
    }
  };

  // Filter medications that have any tracking data
  // In compact mode with alerts enabled, show medication even without data
  let medicationsWithData = medications.filter((med) => {
    const medData = calendarDataByMedication.get(med.id);
    const hasTrackingData =
      medData &&
      !medData.isEmpty &&
      medData.dailyData &&
      medData.dailyData.length > 0;

    // DEBUG: Log filtering decisions for specific medications
    if (
      med.id === "TJK4fpObYgVfZ3KN1OCG" ||
      med.id === "qk37Oo6kpYVc4VkM3uA5"
    ) {
      console.log(`🔍 DEBUG: Filtering ${med.name} (${med.id}):`, {
        hasMedData: !!medData,
        isEmpty: medData?.isEmpty,
        dailyDataLength: medData?.dailyData?.length || 0,
        hasTrackingData,
        compact,
        alertsEnabled,
        willShow: hasTrackingData || (compact && alertsEnabled === true),
      });
    }

    // In compact mode, respect alertsEnabled setting
    if (compact && alertsEnabled !== null) {
      // If alerts are disabled, hide tracker completely
      if (alertsEnabled === false) {
        return false;
      }
      // If alerts are enabled, show medication even without data
      if (alertsEnabled === true) {
        return true;
      }
    }

    // Otherwise, only show if there's actual tracking data
    return hasTrackingData;
  });

  // If singleMedicationId is provided, filter to just that medication
  if (singleMedicationId) {
    medicationsWithData = medicationsWithData.filter(
      (med) => med.id === singleMedicationId
    );
  }

  if (loading || dataProcessing) {
    // In compact mode, show nothing while loading
    if (compact) {
      return null;
    }
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Loading habit tracker...
        </Typography>
      </Box>
    );
  }

  if (medicationsWithData.length === 0) {
    // In compact mode, return null (filtering above already handled alertsEnabled logic)
    if (compact) {
      return null;
    }
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h6" gutterBottom>
          No tracking data yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start responding to SMS reminders to see your progress here!
        </Typography>
      </Box>
    );
  }

  // Set responsive defaults - adjust for compact mode
  const actualDaysBack = daysBack || (compact ? 7 : isMobile ? 5 : 10);

  // In compact mode, if alerts are enabled but there's no actual tracking data, don't show anything
  if (compact && alertsEnabled === true && medicationsWithData.length > 0) {
    const hasAnyTrackingData = medicationsWithData.some((medication) => {
      const progressSummary = getProgressSummary(medication.id);
      return progressSummary !== null;
    });

    if (!hasAnyTrackingData) {
      return null;
    }
  }
  const days = generateDays();
  const iconSize = compact ? (isMobile ? 18 : 20) : isMobile ? 20 : 22;
  const medicationNameWidth = compact ? 0 : isMobile ? 130 : 180;

  return (
    <Box
      sx={{
        mb: compact ? 0 : 3,
        display: "flex",
        justifyContent: compact ? "flex-start" : "center",
      }}
    >
      <Box sx={{ overflowX: "auto", maxWidth: "100%" }}>
        {/* Day headers - hide in compact mode since we're showing a single medication in a card */}
        {!compact && (
          <Box
            sx={{ display: "flex", alignItems: "center", mb: isMobile ? 2 : 3 }}
          >
            {/* Empty space for medication names */}
            <Box sx={{ width: medicationNameWidth, pr: isMobile ? 1.5 : 3 }} />

            {/* Day columns */}
            {days.map((day, index) => (
              <Box
                key={day.date}
                sx={{
                  minWidth: iconSize + (isMobile ? 6 : 16),
                  textAlign: "center",
                  mx: isMobile ? 0.3 : 1,
                }}
              >
                <Typography
                  variant="caption"
                  color={day.isToday ? "primary.main" : "text.secondary"}
                  sx={{
                    fontSize: isMobile ? "0.9rem" : "1rem",
                    fontWeight: day.isToday ? 600 : 500,
                    display: "block",
                    lineHeight: 1,
                  }}
                >
                  {day.dayOfMonth}
                </Typography>
                <Typography
                  variant="caption"
                  color={day.isToday ? "primary.main" : "text.secondary"}
                  sx={{
                    fontSize: isMobile ? "0.6rem" : "0.6rem",
                    fontWeight: day.isToday ? 500 : 400,
                    display: "block",
                    lineHeight: 1,
                    mt: isMobile ? 0.1 : 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  {day.dayOfWeek}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Compact mode: Day headers with letters only */}
        {compact && (
          <Box sx={{ display: "flex", mt: 1.5, mb: 0.5 }}>
            {days.map((day) => (
              <Box
                key={day.date}
                sx={{
                  textAlign: "center",
                  minWidth: iconSize + (isMobile ? 4 : 8),
                  mx: isMobile ? 0.1 : 0.25,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="caption"
                  color={day.isToday ? "primary.main" : "text.secondary"}
                  sx={{
                    fontSize: isMobile ? "0.7rem" : "0.7rem",
                    lineHeight: 1,
                    fontWeight: day.isToday ? 600 : 400,
                    opacity: day.isToday ? 1 : 0.7,
                  }}
                >
                  {day.dayOfWeek[0]}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Medication rows */}
        {medicationsWithData.map((medication, medIndex) => (
          <Box key={medication.id} sx={{ mb: compact ? 0 : 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: compact ? 0 : isMobile ? 1.5 : 2,
                py: compact ? (isMobile ? 0.2 : 0.5) : isMobile ? 0.5 : 1,
                minHeight: iconSize + 4, // Ensure consistent row height
              }}
            >
              {/* Medication name - hide in compact mode */}
              {!compact && (
                <Box
                  sx={{
                    width: medicationNameWidth,
                    pr: isMobile ? 1.5 : 3,
                    display: "flex",
                    alignItems: "center", // Vertically center medication name
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontSize: isMobile ? "0.9rem" : "1rem",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {medication.name}
                  </Typography>
                </Box>
              )}

              {/* Day icons */}
              {days.map((day) => {
                const status = getMedicationStatus(medication.id, day.date);

                return (
                  <Box
                    key={day.date}
                    sx={{
                      minWidth:
                        iconSize +
                        (compact ? (isMobile ? 4 : 8) : isMobile ? 6 : 16),
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      mx: compact
                        ? isMobile
                          ? 0.1
                          : 0.25
                        : isMobile
                        ? 0.3
                        : 1,
                      height: iconSize + 4, // Ensure consistent icon container height
                    }}
                  >
                    <Tooltip
                      title={getTooltipText(medication.id, day.date)}
                      arrow
                      placement="top"
                    >
                      <Box
                        sx={{
                          cursor: status !== "no-data" ? "help" : "default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {status === "complete" ? (
                          <CheckCircleRounded
                            sx={{
                              fontSize: iconSize + 2,
                              color: "primary.main",
                              display: "block",
                            }}
                          />
                        ) : status === "partial" ? (
                          <CircleRounded
                            sx={{
                              fontSize: Math.max(14, iconSize / 1.3),
                              color: "primary.main",
                              opacity: 0.5,
                              display: "block",
                            }}
                          />
                        ) : status === "missed" ? (
                          <CircleRounded
                            sx={{
                              fontSize: Math.max(10, iconSize / 1.7),
                              color: "grey.400",
                              opacity: 0.7,
                              display: "block",
                            }}
                          />
                        ) : (
                          <CircleRounded
                            sx={{
                              fontSize: Math.max(8, iconSize / 2),
                              color: "grey.300",
                              opacity: 0.3,
                              display: "block",
                            }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  </Box>
                );
              })}

              {/* Overall adherence - hide in compact mode */}
              {!compact && (
                <Box
                  sx={{
                    ml: isMobile ? 0.5 : 2,
                    minWidth: isMobile ? 30 : 60,
                    display: "flex",
                    alignItems: "center", // Vertically center adherence stats
                  }}
                >
                  {(() => {
                    const adherence = getMedicationAdherence(medication.id);

                    if (adherence.total === 0) return null;

                    return (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: isMobile ? "0.8rem" : "0.8rem",
                          fontWeight: 600,
                          color: "text.secondary",
                          opacity: 0.8,
                          textAlign: "right",
                        }}
                      >
                        {adherence.taken}/{adherence.total}
                      </Typography>
                    );
                  })()}
                </Box>
              )}
            </Box>

            {/* Compact mode summary - BELOW the entire medication row */}
            {compact && getProgressSummary(medication.id) && (
              <Box sx={{ textAlign: "left" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.2,
                    opacity: 0.8,
                  }}
                >
                  {getProgressSummary(medication.id)}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MedicationHabitTracker;
