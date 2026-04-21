import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";

const ProfessionalDisclaimer = ({ userData }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (userData?.role === "professional") {
      setOpen(true);
    }
  }, [userData?.role]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      aria-labelledby="disclaimer-dialog-title"
      PaperProps={{
        sx: {
          p: 2,
        },
      }}
    >
      <DialogTitle
        id="disclaimer-dialog-title"
        sx={{
          textAlign: "center",
          pb: 1,
        }}
      >
        Important Notice for Medical Professionals
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography paragraph sx={{ textAlign: "center" }}>
            The materials on this site are provided for general medical
            education purposes only and should not be applied rigidly or
            universally in any clinical scenario. Decisions regarding patient
            care must remain the professional responsibility of the individual
            medical practitioner, who must use clinical judgment based on the
            unique circumstances of each case.
          </Typography>
          <Typography paragraph sx={{ textAlign: "center" }}>
            My HealthDesk Pro is intended strictly for use by medical
            professionals. Neither My HealthDesk nor its representatives assume
            legal, financial, or medical liability for decisions made using, or
            based on, the information provided through its platform.
          </Typography>
          <Typography paragraph sx={{ textAlign: "center" }}>
            Any use of My HealthDesk Pro by non-medical professionals is
            entirely at your own risk. It is strongly recommended that
            non-medical users seek professional medical advice to ensure
            appropriate care.
          </Typography>
          <Typography sx={{ textAlign: "center" }}>
            By accessing and using this site, you agree to these conditions as
            well as the full My HealthDesk Terms of Use.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: "center",
          pt: 2,
          pb: 2,
        }}
      >
        <Button
          onClick={handleClose}
          variant="contained"
          color="primary"
          sx={{ px: 4 }}
        >
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfessionalDisclaimer;
