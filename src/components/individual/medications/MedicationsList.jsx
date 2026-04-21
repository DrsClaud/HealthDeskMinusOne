import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { MedicationRounded } from "@mui/icons-material";

const MedicationsList = () => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        maxWidth: 800,
        textAlign: "center",
        backgroundColor: "grey.50",
      }}
    >
      <MedicationRounded sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Medication Management Component
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This is where the comprehensive medication management system will be
        implemented.
      </Typography>
      <Box sx={{ mt: 2, p: 2, backgroundColor: "white", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Features to be added:
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          • Medication tracking and management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Adherence monitoring with streaks and badges
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Smart reminders and notifications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Drug interaction checking
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • AI-powered prescription analysis
        </Typography>
      </Box>
    </Paper>
  );
};

export default MedicationsList;
