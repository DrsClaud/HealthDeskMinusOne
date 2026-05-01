import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LocalHospitalRounded from "@mui/icons-material/LocalHospitalRounded";
import HealthAndSafetyRounded from "@mui/icons-material/HealthAndSafetyRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import MedicationRounded from "@mui/icons-material/MedicationRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import MuiLink from "@mui/material/Link";

const ActionCard = ({ icon, title, description, path, onNavigate }) => (
  <Card sx={{ height: "100%" }}>
    <CardActionArea onClick={() => onNavigate(path)} sx={{ height: "100%", p: 2 }}>
      <CardContent sx={{ textAlign: "center" }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: "primary.50",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 1.5,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 28, color: "primary.main" } })}
        </Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

const P4WorkspacePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const workspaceLabel = userData?.role === "p4" ? "P4 Patient Home" : "Patient Home";
  const showCheckInCard = userData?.role !== "p4";

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mt: { xs: 1, sm: 2 }, mb: 1 }}>
          {workspaceLabel}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your home for health records, check-in, and medical tools
        </Typography>
      </Box>

      {userData?.role === "p4" ? (
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <MuiLink
            component="button"
            type="button"
            underline="hover"
            onClick={() => navigate("/dashboard/medical-superintelligence")}
            sx={{ color: "#1b4584", fontWeight: 600, fontSize: "1rem" }}
          >
            Medical SuperIntelligence<sup>3</sup>
          </MuiLink>
        </Box>
      ) : null}

      <Grid container spacing={2}>
        {showCheckInCard ? (
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<LinkIcon />}
              title="Check In"
              description="Check in to participating facilities"
              path="/dashboard/create-affiliation"
              onNavigate={navigate}
            />
          </Grid>
        ) : null}
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<LocalHospitalRounded />}
            title="Symptom Checker"
            description="Check your symptoms"
            path="/dashboard/symptom-check"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<HealthAndSafetyRounded />}
            title="Continuous Medical Record (CMR)"
            description="All available health records"
            path="/dashboard/health-records"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<AssignmentRounded />}
            title="Discharge Instructions"
            description="Instructions and summaries from facilities"
            path="/dashboard/discharge-instructions"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<MedicationRounded />}
            title="My Medications"
            description="View and manage medications"
            path="/dashboard/medications"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<HistoryRounded />}
            title="Update My Medications"
            description="Voice conversation to review and update medications"
            path="/dashboard/review-history"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<TrendingUpRounded />}
            title="Medication Tracking"
            description="Track your medications"
            path="/dashboard/medication-tracking"
            onNavigate={navigate}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default P4WorkspacePage;
