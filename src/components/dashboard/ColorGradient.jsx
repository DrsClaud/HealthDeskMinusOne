import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { HelpRounded } from "@mui/icons-material";

function ColorGradient({
  startColor = "#C31111", // Red (Score 0)
  midColor1 = "#F59802", // Orange (Score 33)
  midColor2 = "#5BA218", // Yellow (Score 66)
  endColor = "#118B1F", // Green (Score 100)
  facilityType = "clinic",
  sx = {},
  ...props
}) {
  const [helpOpen, setHelpOpen] = React.useState(false);

  const getTitleAndHelp = () => {
    if (facilityType === "emergency") {
      return {
        title: "MEDICARE SCORE",
        helpText:
          "The CMS SCORE represents the official Medicare Overall Hospital Quality Star Rating, evaluating five key performance categories: mortality rates, safety of care, readmission rates, patient experience, and timely and effective care. This comprehensive rating system transforms complex healthcare metrics into an accessible one-to-five star scale, empowering patients to make informed decisions about their care providers.",
      };
    }
    return {
      title: "YOUR HEALTHDESK SCORE",
      helpText:
        "CareMap features are designed to improve healthcare utilization and outcomes. The My HealthDesk score combines Medicare quality data, if available, with CareMap feature utilization data. Access to the complete set of CareMap features requires financial participation by the facility.",
    };
  };

  const { title, helpText } = getTitleAndHelp();

  const gradientStyle = {
    background: `linear-gradient(to right, ${startColor} 0%, ${midColor1} 33%, ${midColor2} 66%, ${endColor} 100%)`,
    borderRadius: 1,
    height: { xs: 20, sm: 22, md: 24 },
    width: "100%",
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
          mt: 1,
          mb: 2,
          ...sx,
        }}
        {...props}
      >
        {/* Title with Help Icon */}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ mb: { xs: "-10px", sm: "-15px" } }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: { xs: 12, sm: 13, md: 14 },
            }}
          >
            {title}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setHelpOpen(true)}
            sx={{
              color: "#1b4584",
              ml: 0.5,
              p: 0.25,
            }}
          >
            <HelpRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Labels */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={0.25}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: { xs: 8, sm: 9, md: 10 },
              fontWeight: 500,
              color: "text.secondary",
              opacity: 0.8,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Worst
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: { xs: 8, sm: 9, md: 10 },
              fontWeight: 500,
              color: "text.secondary",
              opacity: 0.8,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Best
          </Typography>
        </Box>

        {/* Gradient Bar */}
        <Box sx={gradientStyle} />
      </Box>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}>
        <DialogTitle>About {title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{helpText}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ColorGradient;
