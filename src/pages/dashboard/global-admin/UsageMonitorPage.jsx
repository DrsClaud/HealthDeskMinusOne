import React, { useState, useContext, useEffect, useMemo } from "react";
import { db } from "services/firebase";
import { AuthContext } from "context/Auth";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Grid,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import MonetizationOnRounded from "@mui/icons-material/MonetizationOnRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import CallMadeRounded from "@mui/icons-material/CallMadeRounded";
import { calculateAggregatedCost, formatCost } from "utils/costCalculator";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const StatCard = ({ title, value, subtitle, icon, color = "primary" }) => (
  <Paper
    sx={{
      p: 2,
      textAlign: "center",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
      bgcolor: `${color}.50`,
    }}
  >
    {React.cloneElement(icon, {
      color: color,
      sx: { fontSize: 28, mb: 0.5 },
    })}
    <Typography variant="h6">{value}</Typography>
    <Typography
      variant="subtitle2"
      color="text.secondary"
      sx={{
        display: "block",
        mb: 1,
        fontSize: "0.75rem",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: "0.75rem" }}
      >
        {subtitle}
      </Typography>
    )}
  </Paper>
);

const SourceTable = ({ sources }) => {
  const sortedSources = Object.entries(sources).sort(
    ([, a], [, b]) => b.cost - a.cost
  );

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Source</TableCell>
            <TableCell align="right">Total Tokens</TableCell>
            <TableCell align="right">API Calls</TableCell>
            <TableCell align="right">Estimated Cost</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedSources.map(([name, data]) => (
            <TableRow key={name}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {name}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {data.tokens.toLocaleString()}
              </TableCell>
              <TableCell align="right">{data.calls.toLocaleString()}</TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCost(data.cost)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ModelTable = ({ sources }) => {
  const modelAggregates = {};

  Object.values(sources).forEach((sourceData) => {
    Object.entries(sourceData.models).forEach(([modelName, modelData]) => {
      if (!modelAggregates[modelName]) {
        modelAggregates[modelName] = { tokens: 0, calls: 0, cost: 0 };
      }
      modelAggregates[modelName].tokens += modelData.tokens;
      modelAggregates[modelName].calls += modelData.calls;
      modelAggregates[modelName].cost += modelData.cost;
    });
  });

  const sortedModels = Object.entries(modelAggregates).sort(
    ([, a], [, b]) => b.cost - a.cost
  );

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Model</TableCell>
            <TableCell align="right">Total Tokens</TableCell>
            <TableCell align="right">API Calls</TableCell>
            <TableCell align="right">Estimated Cost</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedModels.map(([modelName, data]) => (
            <TableRow key={modelName}>
              <TableCell>
                <Chip label={modelName} size="small" />
              </TableCell>
              <TableCell align="right">
                {data.tokens.toLocaleString()}
              </TableCell>
              <TableCell align="right">{data.calls.toLocaleString()}</TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCost(data.cost)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const UserTable = ({ users }) => {
  const sortedUsers = Object.entries(users).sort(
    ([, a], [, b]) => b.cost - a.cost
  );

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>User ID</TableCell>
            <TableCell align="right">Total Tokens</TableCell>
            <TableCell align="right">API Calls</TableCell>
            <TableCell align="right">Estimated Cost</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedUsers.map(([userId, data]) => (
            <TableRow key={userId}>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                >
                  {userId}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {data.tokens.toLocaleString()}
              </TableCell>
              <TableCell align="right">{data.calls.toLocaleString()}</TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCost(data.cost)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const UsageMonitorPage = () => {
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();

  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const displayName = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      months.push({ value: yearMonth, label: displayName });
    }

    return months;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0].value);

  const selectedMonthLabel = useMemo(
    () =>
      availableMonths.find((m) => m.value === selectedMonth)?.label ||
      selectedMonth,
    [availableMonths, selectedMonth]
  );

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);

        const doc = await db
          .collection("usage_monthly")
          .doc(selectedMonth)
          .get();

        if (!doc.exists) {
          setMonthlyData(null);
        } else {
          const data = doc.data();
          const costData = calculateAggregatedCost(data);
          setMonthlyData(costData);
        }
      } catch (error) {
        console.error("Failed to load usage data:", error);
        setError("Failed to load usage data");
      } finally {
        setLoading(false);
      }
    };

    if (userData?.admin) {
      fetchUsageData();
    }
  }, [userData, selectedMonth]);

  if (userData && !userData?.admin) navigate("/dashboard");

  if (userData?.admin)
    return (
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <DashboardPageHeader
            title="Usage Monitor"
            subtitle={
              <Typography sx={{ display: "block", maxWidth: "40rem" }}>
                Track OpenAI API usage and estimated costs across different
                months.
              </Typography>
            }
          />

          <Alert severity="info" sx={{ mb: 3 }}>
            Costs are estimates based on October 2025 OpenAI pricing. Always
            verify actual costs in your OpenAI billing dashboard.
          </Alert>

          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 250 }}>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                size="small"
              >
                {availableMonths.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
        </Box>

        {loading ? (
          <CircularProgress size={30} />
        ) : !monthlyData ? (
          <Alert severity="warning">
            No usage data found for {selectedMonthLabel}. Data will appear once
            tracking is enabled and API calls are made.
          </Alert>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3, alignItems: "stretch" }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Cost"
                  value={formatCost(monthlyData.totalCost, true)}
                  subtitle="OpenAI API spending this month"
                  icon={<MonetizationOnRounded />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Tokens"
                  value={monthlyData.totalTokens.toLocaleString()}
                  subtitle="Input + output combined"
                  icon={<TrendingUpRounded />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Avg Cost/User"
                  value={formatCost(monthlyData.avgCostPerUser)}
                  subtitle="Average spending per user"
                  icon={<SmartToyRounded />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Users"
                  value={monthlyData.userCount.toLocaleString()}
                  subtitle="Unique users this month"
                  icon={<CallMadeRounded />}
                  color="warning"
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
              Cost by Source
            </Typography>
            <SourceTable sources={monthlyData.sources} />

            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
              Cost by Model
            </Typography>
            <ModelTable sources={monthlyData.sources} />

            {monthlyData.users &&
              Object.keys(monthlyData.users).length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
                    Cost by User
                  </Typography>
                  <UserTable users={monthlyData.users} />
                </>
              )}
          </>
        )}
      </Box>
    );

  return <CircularProgress />;
};

export default UsageMonitorPage;
