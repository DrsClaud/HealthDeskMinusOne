import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Typography,
  useTheme,
} from "@mui/material";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { db } from "services/firebase";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/** Plot height (~30% of the previous 280px canvas area) */
const CHART_PLOT_HEIGHT_PX = 84;

function buildAvailableMonths(count = 6) {
  const months = [];
  const now = new Date();

  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;

    months.push({
      value,
      label: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
    });
  }

  return months;
}

function getDateParts(yearMonth) {
  const [year, month] = String(yearMonth)
    .split("-")
    .map((value) => Number(value));

  return {
    year,
    month,
    daysInMonth: new Date(year, month, 0).getDate(),
  };
}

const GraphMonthlyUsageChartmind = ({ organizationId }) => {
  const theme = useTheme();
  const availableMonths = useMemo(() => buildAvailableMonths(6), []);
  const [selectedMonth, setSelectedMonth] = useState(
    availableMonths[0]?.value || "",
  );
  const [monthlyUsage, setMonthlyUsage] = useState({});
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !selectedMonth) {
      setMonthlyUsage({});
      setLoading(false);
      setError("");
      return undefined;
    }

    let cancelled = false;

    const loadMonthlyUsage = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot = await db
          .collection("organizations")
          .doc(organizationId)
          .collection("chartmind_usage_daily")
          .where("yearMonth", "==", selectedMonth)
          .get();

        if (cancelled) {
          return;
        }

        const nextUsage = {};
        snapshot.forEach((doc) => {
          const data = doc.data() || {};
          const dateKey = data.dateKey || doc.id;
          nextUsage[dateKey] = Number(data.completedSessionsCount || 0);
        });

        setMonthlyUsage(nextUsage);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "[GraphMonthlyUsageChartmind] Failed to load usage data:",
          loadError,
        );
        setError(loadError.message || "Failed to load ChartMind usage.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMonthlyUsage();

    return () => {
      cancelled = true;
    };
  }, [organizationId, selectedMonth]);

  const chartSeries = useMemo(() => {
    if (!selectedMonth) {
      return { labels: [], counts: [], hasUsage: false };
    }

    const { year, month, daysInMonth } = getDateParts(selectedMonth);
    const labels = [];
    const counts = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;

      labels.push(String(day));
      counts.push(Number(monthlyUsage[dateKey] || 0));
    }

    return {
      labels,
      counts,
      hasUsage: counts.some((count) => count > 0),
    };
  }, [monthlyUsage, selectedMonth]);

  const chartData = useMemo(
    () => ({
      labels: chartSeries.labels,
      datasets: [
        {
          label: "Completed ChartMind sessions",
          data: chartSeries.counts,
          backgroundColor: theme.palette.primary.main,
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 6,
        },
      ],
    }),
    [chartSeries.counts, chartSeries.labels, theme.palette.primary.main],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 0, right: 4, top: 2, bottom: 0 },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (context) => {
              const dayLabel = context[0]?.label || "";
              return `${availableMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth} ${dayLabel}`;
            },
            label: (context) =>
              `${context.parsed.y} completed ChartMind session${
                context.parsed.y === 1 ? "" : "s"
              }`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            stepSize: 1,
            font: { size: 9 },
            maxTicksLimit: 4,
          },
          title: { display: false },
        },
        x: {
          title: { display: false },
          ticks: {
            autoSkip: chartSeries.labels.length > 16,
            maxTicksLimit: 16,
            font: { size: 9 },
          },
          grid: {
            display: false,
          },
        },
      },
    }),
    [availableMonths, chartSeries.labels.length, selectedMonth],
  );

  if (!organizationId) {
    return null;
  }

  return (
    <Paper sx={{ mt: 3, p: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          gap: 2,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            ChartMind Usage
          </Typography>
          <Typography variant="h6">
            Completed sessions for your organization
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Counts increase the first time a ChartMind session reaches the final
            chart step.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {availableMonths.map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box
          sx={{
            height: CHART_PLOT_HEIGHT_PX,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={22} />
        </Box>
      ) : (
        <>
          <Box sx={{ height: CHART_PLOT_HEIGHT_PX, position: "relative" }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
          {!chartSeries.hasUsage ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No completed ChartMind sessions have been recorded for this month
              yet.
            </Typography>
          ) : null}
        </>
      )}
    </Paper>
  );
};

export default GraphMonthlyUsageChartmind;
