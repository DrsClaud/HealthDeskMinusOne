import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Typography } from "@mui/material";
import { useAuth } from "hooks/useAuth";
import useMfaStatus from "hooks/useMfaStatus";
import DashboardLayout from "components/dashboard/DashboardLayout";
import DashboardRoutes from "routes/DashboardRoutes";
import PatientRoutes from "routes/PatientRoutes";
import ProfessionalRoutes from "routes/ProfessionalRoutes";
import AdminRoutes from "routes/AdminRoutes";
import GlobalAdminRoutes from "routes/GlobalAdminRoutes";
import RegionalAdminRoutes from "routes/RegionalAdminRoutes";
import { ChatProvider } from "context/Chat";
import { db } from "services/firebase";
import Loading from "components/Loading";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { shouldSkipMfaEnrollmentUi } from "utils/isDevEnvironment";

const DashboardPage = () => {
  const { user, userLoading, userData, isGlobalAdmin } = useAuth();
  const { isEnrolled, sessionMfaLoading } = useMfaStatus();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userDocChecked, setUserDocChecked] = useState(false);

  // Effect to handle authentication and data loading
  useEffect(() => {
    const checkUserStatus = async () => {
      // Wait for authentication to complete
      if (userLoading) return;

      // If no user, we'll handle redirect in the render
      if (!user) {
        setIsLoading(false);
        setUserDocChecked(true);
        return;
      }

      // If userData is already loaded through useAuth hook
      if (userData) {
        setIsLoading(false);
        setUserDocChecked(true);
        return;
      }

      // If we have a user but no userData, check Firestore directly
      try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        if (!userDoc.exists) {
          // Redirect to onboarding if no user document
          navigate("/onboarding");
        } else if (userData.onboarding) {
          // If user is still in onboarding, redirect back to onboarding
          navigate("/onboarding");
        } else {
          // We've confirmed the document exists and onboarding is complete
          setIsLoading(false);
          setUserDocChecked(true);
        }
      } catch (error) {
        console.error("Error checking user document:", error);
        setIsLoading(false);
        setUserDocChecked(true);
      }
    };

    checkUserStatus();
  }, [user, userLoading, userData]);

  // If still loading or user document hasn't been checked, show loading screen
  if (isLoading || !userDocChecked) {
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Loading page />
      </Box>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!sessionMfaLoading && !isEnrolled && !shouldSkipMfaEnrollmentUi()) {
    return <Navigate to="/onboarding" />;
  }

  if (sessionMfaLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Loading page />
      </Box>
    );
  }

  // Safety-net: unverified email users who slipped past the AuthFlow gate.
  // (Shouldn't happen for new sign-ups, but covers legacy/edge-case accounts.)
  if (!user.emailVerified) {
    const resend = async () => {
      try {
        await firebase.auth().currentUser.sendEmailVerification();
      } catch (e) {
        /* ignore */
      }
    };
    return (
      <DashboardLayout>
        <Typography variant="h5" sx={{ mt: { xs: 4, sm: 8 }, mb: 2 }}>
          Confirm your email
        </Typography>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please verify your email address before continuing. Check your inbox
          for a link from us.
        </Alert>
        <Button variant="contained" onClick={resend}>
          Resend Verification Email
        </Button>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Need help? Email{" "}
            <a href="mailto:support@md3c.com">support@md3c.com</a>
          </Typography>
        </Box>
      </DashboardLayout>
    );
  }

  // If we have userData but no role, redirect to onboarding
  if (userData && !userData.role) {
    navigate("/onboarding");
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Loading page />
      </Box>
    );
  }

  return (
    <ChatProvider>
      {isGlobalAdmin ? (
        <GlobalAdminRoutes />
      ) : userData?.role === "regional_admin" ? (
        String(userData?.region || "").trim() ? (
          <RegionalAdminRoutes />
        ) : (
          <DashboardLayout>
            <Alert severity="warning" sx={{ m: 2 }}>
              Your account is missing <strong>region</strong> on your user
              document. An administrator must set it to match regional prompt
              scope (any stable string).
            </Alert>
          </DashboardLayout>
        )
      ) : userData?.role === "patient" ? (
        <PatientRoutes />
      ) : userData?.role === "professional" ? (
        <ProfessionalRoutes />
      ) : userData?.role === "admin" ? (
        <AdminRoutes />
      ) : (
        <DashboardRoutes />
      )}
    </ChatProvider>
  );
};

export default DashboardPage;
