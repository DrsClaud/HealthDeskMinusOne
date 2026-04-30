import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
} from "@mui/material";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import MedicalServicesRounded from "@mui/icons-material/MedicalServicesRounded";
import HealthAndSafetyRounded from "@mui/icons-material/HealthAndSafetyRounded";
import MedicationRounded from "@mui/icons-material/MedicationRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import UpgradeRounded from "@mui/icons-material/UpgradeRounded";

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

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mt: { xs: 1, sm: 2 }, mb: 1 }}>
          Patient Home
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your workspace for medical guidance, records, and account settings.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<SchoolRounded />}
            title="Basic Medical Library"
            description="Simple medical education"
            path="/dashboard"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<LibraryBooksRounded />}
            title="Advanced Medical Library"
            description="Detailed medical education"
            path="/dashboard/advanced-library"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<MedicalServicesRounded />}
            title="Virtual MD"
            description="Interactive medical education"
            path="/dashboard/virtual-md"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<HealthAndSafetyRounded />}
            title="My Health Records"
            description="View your available health records"
            path="/dashboard/health-records"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<MedicationRounded />}
            title="My Medications"
            description="View and manage your medications"
            path="/dashboard/medications"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<SettingsRounded />}
            title="Settings"
            description="Manage profile and account preferences"
            path="/dashboard/settings"
            onNavigate={navigate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            icon={<UpgradeRounded />}
            title="Upgrade"
            description="Review plans and subscription options"
            path="/dashboard/upgrade"
            onNavigate={navigate}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default P4WorkspacePage;
