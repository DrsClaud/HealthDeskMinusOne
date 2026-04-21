import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  useTheme,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MedicationAdherenceCharts = ({
  dailyData = [],
  loading = false,
  dataProcessing = false,
}) => {
  const theme = useTheme();

  // If still loading, don't render anything (parent will show loading spinner)
  if (loading || dataProcessing || !dailyData.length) {
    return null;
  }

  // Generate weekly pattern data (adherence by day of week)
  const generateWeeklyPatternData = () => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayTotals = Array(7).fill({ total: 0, taken: 0 });

    // Initialize day data properly
    for (let i = 0; i < 7; i++) {
      dayTotals[i] = { total: 0, taken: 0, daysCount: 0 };
    }

    // Group data by day of week
    dailyData.forEach((day) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();

      if (day.total > 0) {
        // Only count days with actual medication data
        dayTotals[dayOfWeek].total += day.total;
        dayTotals[dayOfWeek].taken += day.taken || 0;
        dayTotals[dayOfWeek].daysCount += 1;
      }
    });

    // Calculate tracking percentages
    const trackingByDay = dayTotals.map((day) =>
      day.total > 0 ? Math.round((day.taken / day.total) * 100) : 0
    );

    // Gradient creation code removed - now using solid colors

    return {
      labels: dayNames,
      datasets: [
        {
          label: "Medication Tracking %",
          data: trackingByDay,
          backgroundColor: theme.palette.primary.main, // Fully solid bars
          borderWidth: 0, // Remove borders for cleaner look
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: `${theme.palette.primary.main}DD`,
          hoverBorderWidth: 0, // No border on hover
          dayTotals: dayTotals, // Store day info for tooltips
        },
      ],
    };
  };

  // Generate weekly trend data (show flatline for pre-tracking weeks, then real data)
  const generateWeeklyTrendData = () => {
    // Find the earliest tracking date
    const earliestDate =
      dailyData.length > 0
        ? new Date(Math.min(...dailyData.map((day) => new Date(day.date))))
        : new Date();

    // Generate 6 weeks ending with current week
    const weeks = [];
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // This week's Sunday

    // Generate 6 weeks back from current week
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() - i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      weeks.push({ weekStart, weekEnd, total: 0, taken: 0 });
    }

    // Fill in real data for weeks that have tracking
    dailyData.forEach((day) => {
      const date = new Date(day.date);

      // Normalize all dates to midnight to avoid time comparison issues
      date.setHours(0, 0, 0, 0);

      // Find which week this day belongs to
      const weekIndex = weeks.findIndex((week) => {
        const weekStart = new Date(week.weekStart);
        const weekEnd = new Date(week.weekEnd);
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        return date >= weekStart && date <= weekEnd;
      });

      if (weekIndex >= 0) {
        weeks[weekIndex].total += day.total || 0;
        weeks[weekIndex].taken += day.taken || 0;
      }
    });

    // Generate labels and data
    const labels = weeks.map((week) =>
      week.weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );

    const trackingData = weeks.map((week) => {
      // If week is before tracking started, show 0%
      if (week.weekEnd < earliestDate) {
        return 0;
      }
      // Otherwise show real percentage
      return week.total > 0 ? Math.round((week.taken / week.total) * 100) : 0;
    });

    // Store week info for tooltips
    const weekInfo = weeks.map((week) => ({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      total: week.total,
      taken: week.taken,
      isPreTracking: week.weekEnd < earliestDate,
    }));

    return {
      labels,
      datasets: [
        {
          label: "Weekly Medication Tracking %",
          data: trackingData,
          borderColor: theme.palette.primary.main,
          backgroundColor: `rgba(${parseInt(
            theme.palette.primary.main.slice(1, 3),
            16
          )}, ${parseInt(
            theme.palette.primary.main.slice(3, 5),
            16
          )}, ${parseInt(theme.palette.primary.main.slice(5, 7), 16)}, 0.2)`,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: true,
          shadowOffsetX: 0,
          shadowOffsetY: 2,
          shadowBlur: 6,
          shadowColor: "rgba(33, 150, 243, 0.2)",
          weekInfo: weekInfo, // Store week info for tooltip access
        },
      ],
    };
  };

  const weeklyPatternData = generateWeeklyPatternData();
  const weeklyTrendData = generateWeeklyTrendData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
    animation: {
      duration: 800,
      easing: "easeInOutCubic",
    },
    elements: {
      bar: {
        borderRadius: 8,
      },
    },
    plugins: {
      legend: {
        display: false, // Hide legend for cleaner look
      },
      tooltip: {
        backgroundColor: "rgba(97, 97, 97, 0.95)", // MUI-like dark background
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderWidth: 0, // No border like MUI tooltips
        cornerRadius: 4, // Smaller radius like MUI
        padding: 8, // Smaller padding like MUI
        titleFont: {
          family: theme.typography.fontFamily,
          size: 12,
          weight: 500,
        },
        bodyFont: {
          family: theme.typography.fontFamily,
          size: 11,
        },
        displayColors: false,
        caretSize: 4, // Small arrow like MUI
        callbacks: {
          title: function (context) {
            const dayName = context[0].label;
            // Convert abbreviated day to full day name
            const fullDayNames = {
              Sun: "Sunday",
              Mon: "Monday",
              Tue: "Tuesday",
              Wed: "Wednesday",
              Thu: "Thursday",
              Fri: "Friday",
              Sat: "Saturday",
            };
            const fullDay = fullDayNames[dayName] || dayName;
            return `${fullDay}s`;
          },
          label: function (context) {
            const percentage = context.parsed.y;
            const dayTotals = context.dataset.dayTotals[context.dataIndex];

            if (dayTotals && dayTotals.total > 0) {
              const taken = dayTotals.taken;
              const total = dayTotals.total;
              return `${percentage}% adherence (${taken}/${total} doses)`;
            }
            return `${percentage}% adherence`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20, // Show every 20% (0%, 20%, 40%, 60%, 80%, 100%)
          callback: function (value) {
            return value + "%";
          },
          font: {
            family: theme.typography.fontFamily,
            size: 11,
          },
          color: theme.palette.text.secondary,
          padding: 8,
        },
        grid: {
          color:
            theme.palette.mode === "light"
              ? "rgba(0, 0, 0, 0.06)"
              : "rgba(255, 255, 255, 0.06)",
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
      x: {
        ticks: {
          font: {
            family: theme.typography.fontFamily,
            size: 11,
          },
          color: theme.palette.text.secondary,
          maxRotation: 0, // Keep text horizontal
          minRotation: 0,
          padding: 8,
        },
        grid: {
          display: false, // Clean look for x-axis
        },
        border: {
          display: false,
        },
      },
    },
  };

  const trendChartOptions = {
    ...chartOptions,
    clip: false, // Allow drawing in padding area to prevent cutoff
    layout: {
      padding: {
        top: 25, // Add padding to prevent line cutoff at 100%
        bottom: 5,
        left: 5,
        right: 5,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 0, // No points
        hoverRadius: 0, // No hover points
      },
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          title: function (context) {
            // Get the week info from the dataset
            const weekInfo = context[0].dataset.weekInfo[context[0].dataIndex];
            if (weekInfo) {
              const startDate = weekInfo.weekStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              const endDate = weekInfo.weekEnd.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return `Week of ${startDate} - ${endDate}`;
            }
            return "";
          },
          label: function (context) {
            const percentage = context.parsed.y;
            const weekInfo = context.dataset.weekInfo[context.dataIndex];

            if (weekInfo) {
              if (weekInfo.isPreTracking) {
                return `No tracking yet`;
              } else if (weekInfo.total > 0) {
                const taken = weekInfo.taken;
                const total = weekInfo.total;
                return `${percentage}% adherence (${taken}/${total} doses)`;
              } else {
                return `No medication reminders this week`;
              }
            }
            return `${percentage}% adherence`;
          },
        },
      },
    },
    animation: {
      duration: 1200,
      easing: "easeInOutCubic",
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default") {
          delay = context.dataIndex * 100;
        }
        return delay;
      },
    },
    animations: {
      y: {
        duration: 1200,
        easing: "easeInOutCubic",
        from: 0,
      },
      x: {
        duration: 800,
        easing: "easeInOutCubic",
      },
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        grid: {
          ...chartOptions.scales.y.grid,
          color:
            theme.palette.mode === "light"
              ? "rgba(0, 0, 0, 0.04)"
              : "rgba(255, 255, 255, 0.04)",
        },
      },
    },
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        {/* Weekly Pattern Chart */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Daily Consistency
              </Typography>
              <Box sx={{ height: 250, position: "relative" }}>
                <Bar data={weeklyPatternData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Trend Chart */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                6-Week Progress
              </Typography>
              <Box sx={{ height: 250, position: "relative" }}>
                <Line data={weeklyTrendData} options={trendChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MedicationAdherenceCharts;
