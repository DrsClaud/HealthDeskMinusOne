import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import { format, isFuture, isPast, isToday } from "date-fns";
import CurrentWaitTimeDisplay from 'components/scheduler/CurrentWaitTimeDisplay';

// Map wait time to number of filled dots (1-7)
const getWaitTimeDots = (waitTime) => {
  const waitTimeNum =
    typeof waitTime === "string" ? parseInt(waitTime, 10) : waitTime;
  if (waitTimeNum <= 30) return 1;
  if (waitTimeNum <= 60) return 2;
  if (waitTimeNum <= 120) return 3;
  if (waitTimeNum <= 150) return 4;
  if (waitTimeNum <= 180) return 5;
  if (waitTimeNum <= 240) return 6;
  return 7;
};

// Get color for wait time dots
const getWaitTimeColor = (waitTime) => {
  const waitTimeNum =
    typeof waitTime === "string" ? parseInt(waitTime, 10) : waitTime;
  if (waitTimeNum <= 60) return "success.main"; // Green for short waits
  if (waitTimeNum <= 120) return "warning.light"; // Yellow for medium waits
  if (waitTimeNum <= 180) return "warning.main"; // Orange for longer waits
  if (waitTimeNum <= 240) return "error.light"; // Light red for very long waits
  return "error.main"; // Red for severe waits
};

// Check if this is the currently displayed timeslot
const isActiveTimeslot = (date) => {
  const now = new Date();

  // If it's not today, it's not active
  if (!isToday(date)) return false;

  // Find the most recent time slot that has passed
  const currentHour = now.getHours();
  const slotHour = date.getHours();

  // The time slot is active if it's the most recent passed slot
  // We check if the slot hour is less than or equal to current hour
  // but also the closest one to current hour
  return slotHour <= currentHour && currentHour - slotHour < 4;
};

// Render wait time dots
const WaitTimeDots = ({ waitTime }) => {
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor:
              i < getWaitTimeDots(waitTime)
                ? getWaitTimeColor(waitTime)
                : "grey.300",
          }}
        />
      ))}
    </Box>
  );
};

const ScheduleView = ({ data }) => {
  // Extract and group scheduled times
  const groupedSchedule = useMemo(() => {
    if (!data?.waitTimes?.length) return { scheduledDates: {}, count: 0 };

    // Filter for scheduled entries in the future
    const futureEntries = data.waitTimes.filter(
      (entry) => entry.scheduled && isFuture(new Date(entry.date))
    );

    // Group by date and time
    const byDateTime = {};
    futureEntries.forEach((entry) => {
      const dateObj = new Date(entry.date);
      const dateStr = format(dateObj, "yyyy-MM-dd");
      const timeStr = format(dateObj, "HH:mm");
      const key = `${dateStr}-${timeStr}`;

      if (!byDateTime[key]) {
        byDateTime[key] = {
          date: dateObj,
          dateStr,
          timeStr,
          waitTimes: [],
        };
      }

      byDateTime[key].waitTimes.push({
        waitTime: entry.waitTime,
        originalEntry: entry,
      });
    });

    // Group by date for display
    const scheduledDates = {};
    Object.values(byDateTime).forEach((timeSlot) => {
      if (!scheduledDates[timeSlot.dateStr]) {
        scheduledDates[timeSlot.dateStr] = [];
      }
      scheduledDates[timeSlot.dateStr].push(timeSlot);
    });

    // Sort each date's time slots
    Object.keys(scheduledDates).forEach((dateStr) => {
      scheduledDates[dateStr].sort((a, b) => a.date - b.date);
    });

    return {
      scheduledDates,
      count: Object.values(byDateTime).length,
    };
  }, [data?.waitTimes]);

  // Find the active map display time (most recent non-scheduled entry or most recent scheduled entry)
  const activeMapTime = useMemo(() => {
    if (!data?.waitTimes?.length) return null;

    const now = new Date();
    console.log("Current time for active calculation:", now.toLocaleString());

    // First look for manual (non-scheduled) entries as they take precedence
    const manualEntries = data.waitTimes
      .filter((entry) => !entry.scheduled)
      .sort((a, b) => b.date - a.date); // newest first

    if (manualEntries.length > 0) {
      const latestManual = manualEntries[0];
      console.log("Latest manual entry:", {
        date: new Date(latestManual.date).toLocaleString(),
        waitTime: latestManual.waitTime,
      });

      return {
        isManual: true,
        date: new Date(latestManual.date),
        waitTime: latestManual.waitTime,
        timeDisplay: format(new Date(latestManual.date), "h:mm a"),
      };
    }

    // If no manual entries, find the most recent scheduled entry for today
    const currentHour = now.getHours();

    // Look for today's scheduled entries
    const todaysScheduled = data.waitTimes
      .filter((entry) => entry.scheduled && isToday(new Date(entry.date)))
      .map((entry) => ({
        date: new Date(entry.date),
        hour: new Date(entry.date).getHours(),
        waitTime: entry.waitTime,
        original: entry,
      }))
      .sort((a, b) => a.hour - b.hour); // sort by hour ascending

    console.log(
      "Today's scheduled entries:",
      todaysScheduled.map((entry) => ({
        hour: entry.hour,
        waitTime: entry.waitTime,
      }))
    );

    // Find most recent past entry (most recent hour that is <= current hour)
    let activeSlot = null;
    for (const slot of todaysScheduled) {
      if (slot.hour <= currentHour) {
        activeSlot = slot;
      } else {
        break; // Stop once we find a future entry
      }
    }

    if (activeSlot) {
      console.log("Active scheduled slot:", {
        hour: activeSlot.hour,
        waitTime: activeSlot.waitTime,
      });

      return {
        isManual: false,
        date: activeSlot.date,
        waitTime: activeSlot.waitTime,
        timeDisplay: format(activeSlot.date, "h:mm a"),
      };
    }

    return null;
  }, [data?.waitTimes]);

  if (groupedSchedule.count === 0 && !activeMapTime) {
    return (
      <Box sx={{ mt: 4, maxWidth: 540 }}>
        <Typography variant="body2" color="text.secondary">
          No upcoming scheduled wait times found. Use the scheduler above to add
          some.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4, maxWidth: 540 }}>
      <CurrentWaitTimeDisplay activeTime={activeMapTime} />

      <Typography variant="h6" gutterBottom>
        Upcoming Scheduled Wait Times
      </Typography>

      {groupedSchedule.count === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No upcoming scheduled wait times found. Use the scheduler above to add
          some.
        </Typography>
      ) : (
        Object.entries(groupedSchedule.scheduledDates).map(
          ([dateStr, timeSlots]) => (
            <Paper
              key={dateStr}
              sx={{
                mb: 2,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  p: 2,
                  bgcolor: "background.paper",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {format(timeSlots[0].date, "EEEE, MMMM d, yyyy")}
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="40%">Time</TableCell>
                      <TableCell width="60%">Wait Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timeSlots.map((slot) => {
                      const isActive =
                        activeMapTime &&
                        !activeMapTime.isManual &&
                        slot.date.getHours() ===
                          activeMapTime.date.getHours() &&
                        format(slot.date, "yyyy-MM-dd") ===
                          format(activeMapTime.date, "yyyy-MM-dd");

                      return (
                        <TableRow
                          key={`${dateStr}-${slot.timeStr}`}
                          sx={
                            isActive
                              ? {
                                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                                }
                              : {}
                          }
                        >
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography variant="body2">
                                {format(slot.date, "h:mm a")}
                              </Typography>
                              {isActive && (
                                <Box
                                  component="span"
                                  sx={{
                                    ml: 1,
                                    fontSize: "0.7rem",
                                    color: "primary.main",
                                    bgcolor: "primary.lighter",
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontWeight: "medium",
                                  }}
                                >
                                  Active
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              {slot.waitTimes.map((item, idx) => (
                                <WaitTimeDots
                                  key={idx}
                                  waitTime={item.waitTime}
                                />
                              ))}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )
        )
      )}
    </Box>
  );
};

export default ScheduleView;
