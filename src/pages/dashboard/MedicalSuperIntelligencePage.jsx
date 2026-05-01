import React from "react";
import { Box, Typography, Paper } from "@mui/material";

const MedicalSuperIntelligencePage = () => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mt: { xs: 1, sm: 2 }, mb: 1 }}>
          Medical SuperIntelligence<sup>3</sup>
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Human aspiration, not a machine
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720 }}>
        <Typography variant="body1" paragraph>
          Medical SuperIntelligence is a human aspiration, not a machine.
        </Typography>
        <Typography variant="body1" paragraph>
          Intelligence - genuine intelligence - is a uniquely human capacity. It
          encompasses not just computation and pattern recognition, but judgment,
          wisdom, presence, moral courage, compassion, and the ability to hold
          another person's suffering with grace.
        </Typography>
        <Typography variant="body1" paragraph>
          Artificial intelligence is a powerful tool - capable of processing
          decades of health data in seconds, detecting patterns invisible to the
          unaided eye, reducing documentation burden, and supporting clinical
          decision-making at scale. But it is still a tool.
        </Typography>
        <Typography variant="body1" paragraph sx={{ fontWeight: 600 }}>
          MSI3 is built on this distinction.
        </Typography>
        <Typography variant="body1" paragraph>
          The platform's purpose is not to replace clinical intelligence - it is
          to amplify it. By absorbing computational labor, MSI3 gives clinicians
          back cognitive and emotional bandwidth to practice at full human depth.
        </Typography>
        <Typography variant="body1" paragraph>
          Medical SuperIntelligence is the aspiration of the patient's visit with
          a clinician, and it can be enhanced by the facility.
        </Typography>
      </Paper>
    </Box>
  );
};

export default MedicalSuperIntelligencePage;
