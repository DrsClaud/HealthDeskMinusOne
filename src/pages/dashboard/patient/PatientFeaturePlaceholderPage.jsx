import React from "react";
import { Box, Typography, Paper, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";

const PatientFeaturePlaceholderPage = ({ title, description, primaryAction }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mt: { xs: 1, sm: 2 }, mb: 1 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 780 }}>
        <Typography variant="body1" color="text.secondary">
          This workflow is being ported from Experimental. For now, use the existing
          patient tools below while the full experience is completed.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          {primaryAction ? (
            <Button
              variant="contained"
              onClick={() => navigate(primaryAction.path)}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          <Button variant="outlined" onClick={() => navigate("/dashboard")}>
            Open Basic Medical Library
          </Button>
          <Button variant="outlined" onClick={() => navigate("/dashboard/health-records")}>
            Open Health Records
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default PatientFeaturePlaceholderPage;
