import React, { useState } from "react";
import { Navigate } from "react-router";
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Code as CodeIcon } from "@mui/icons-material";
import UnauthenticatedContextBox from "components/chatbot/UnauthenticatedContextBox";
import EmbedCodeDisplay from "components/embed/EmbedCodeDisplay";
import { UnauthenticatedChatProvider } from "context/UnauthenticatedChat";
import { useAuth } from "hooks/useAuth";
import Loading from "components/Loading";

const PublicChatPage = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, userLoading } = useAuth();

  // Show loading state while checking auth
  if (userLoading) {
    return <Loading />;
  }

  // Redirect to dashboard if authenticated
  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const content = (
    <Box sx={{ position: "relative", height: "100vh" }}>
      <UnauthenticatedContextBox />

      {!isMobile && (
        <>
          <Fab
            color="primary"
            aria-label="embed"
            onClick={() => setOpenDialog(true)}
            sx={{
              position: "fixed",
              bottom: 20,
              left: 20,
              backgroundColor: "#117aca",
              "&:hover": {
                backgroundColor: "#0e63a2",
              },
            }}
          >
            <CodeIcon />
          </Fab>

          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Embed My HealthDesk on your website</DialogTitle>
            <DialogContent>
              <EmbedCodeDisplay />
            </DialogContent>
          </Dialog>
        </>
      )}
    </Box>
  );

  return <UnauthenticatedChatProvider>{content}</UnauthenticatedChatProvider>;
};

export default PublicChatPage;
