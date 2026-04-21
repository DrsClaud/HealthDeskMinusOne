import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon, CheckCircleRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const AdminWelcomeDialog = ({ open, onClose, organization, seatCount = 1 }) => {
  const navigate = useNavigate();

  const handleInviteTeam = () => {
    onClose();
    navigate("/dashboard/team");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ textAlign: "center", p: 4, pb: 2.5 }}>
        <Box sx={{ mb: 3 }}>
          <CheckCircleRounded
            sx={{
              fontSize: 64,
              color: "primary.main",
              mb: 2,
              display: "block",
              mx: "auto",
            }}
          />
        </Box>

        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
          You're All Set!
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {organization?.name || "Your organization"} is ready to use
          ChartMind. You have{" "}
          <strong>
            {seatCount} seat{seatCount !== 1 ? "s" : ""}
          </strong>{" "}
          available for your team.
        </Typography>

        <Box
          sx={{
            borderRadius: 2,
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            Next Steps
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {[
              "Invite providers to join your organization",
              "Customize AI prompts for your team's workflow",
              "Manage billing and seat allocation",
            ].map((step, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <CheckCircleRounded
                  sx={{ color: "primary.main", fontSize: 20, mr: 1.5 }}
                />
                <Typography variant="body2">{step}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", p: 3, pt: 1 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleInviteTeam}
          sx={{ px: 4, py: 1.5 }}
        >
          Invite Your Team
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminWelcomeDialog;
