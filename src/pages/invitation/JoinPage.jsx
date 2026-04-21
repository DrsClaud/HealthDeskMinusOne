import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { CheckCircleRounded } from "@mui/icons-material";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import logoIcon from "assets/images/logos/logo-icon.png";
import AuthFlow from "components/auth/AuthFlow";

/**
 * JoinPage - Accept organization invitation
 * SIMPLE FLOW: Load invitation → show accept button → signup → accept → done
 */
const JoinPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const acceptingRef = useRef(false);
  const inviteAcceptedRef = useRef(false);
  const INVITE_TOKEN_STORAGE_KEY = "pendingOrganizationInviteToken";

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Load invitation details
  useEffect(() => {
    if (token) {
      sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token);
    }

    const loadInvitation = async () => {
      if (!token) {
        sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      try {
        const getInvitation = firebase
          .functions()
          .httpsCallable("getInvitation");
        const result = await getInvitation({ token });

        if (result.data.success) {
          setInvitation(result.data.invitation);
        }
      } catch (err) {
        console.error("Error loading invitation:", err);
        setError(err.message || "Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  // Accept invitation
  const handleAcceptInvitation = async () => {
    if (inviteAcceptedRef.current) {
      setSuccess(true);
      return;
    }
    if (acceptingRef.current) return;
    acceptingRef.current = true;

    setAccepting(true);
    setError("");

    // Wait 1 second for Firestore user doc to be saved (for new signups)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const acceptInvitation = firebase
        .functions()
        .httpsCallable("acceptInvitation");
      await acceptInvitation({ token });
      sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
      inviteAcceptedRef.current = true;

      setSuccess(true);
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError(
        err.message ||
          "Failed to accept invitation. Please refresh and try again."
      );
      acceptingRef.current = false;
      setAccepting(false);
    }
  };

  // After user completes signup
  const handleSignupComplete = async () => {
    await handleAcceptInvitation();
  };

  // Accept invitation immediately after account setup (before MFA),
  // so backend can mark emailVerified and MFA enrollment can proceed.
  const handlePostAccountSetup = async () => {
    if (inviteAcceptedRef.current) return;
    const acceptInvitation = firebase
      .functions()
      .httpsCallable("acceptInvitation");
    await acceptInvitation({ token });
    sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
    inviteAcceptedRef.current = true;
  };

  // Handler for when user clicks "Accept Invitation" button
  const handleAcceptClick = () => {
    if (currentUser) {
      // User is already logged in, accept immediately
      handleAcceptInvitation();
    } else {
      // User needs to sign up first
      setShowSignup(true);
    }
  };

  // Loading invitation
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Invalid invitation
  if (error) {
    // Check if invitation was revoked
    const isRevoked = error.toLowerCase().includes("revoked");
    const isExpired = error.toLowerCase().includes("expired");
    const isAccepted = error.toLowerCase().includes("accepted");

    let title = "Invalid Invitation";
    let message = error;

    if (isRevoked) {
      title = "Invitation Revoked";
      message =
        "This invitation has been cancelled by the organization administrator. Please contact them if you believe this was a mistake.";
    } else if (isExpired) {
      title = "Invitation Expired";
      message =
        "This invitation has expired. Please request a new invitation from the organization administrator.";
    } else if (isAccepted) {
      title = "Invitation Already Used";
      message =
        "This invitation has already been accepted. If you're having trouble accessing your account, please contact support.";
    }

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 400 }}>
          <Typography
            variant="h5"
            fontWeight={600}
            sx={{ mb: 2, color: "primary.main" }}
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Success - accepted invitation
  if (success) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 400 }}>
          <CheckCircleRounded
            sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
          />
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            You're all set!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Welcome to {invitation.organizationName}. You're ready to start
            using ChartMind.
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate("/dashboard")}
            sx={{ py: 1.5 }}
          >
            Go to Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  // Step 1: Show accept invitation button (or auto-accept if logged in)
  if (!showSignup) {
    // If user is already logged in, show accepting state
    if (currentUser && accepting) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            p: 3,
          }}
        >
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Accepting invitation...
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400, textAlign: "center", mb: 4 }}>
          <img
            src={logoIcon}
            alt="HealthDesk"
            style={{ height: 60, marginBottom: 24 }}
          />
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Accept Invitation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {invitation.invitedByName} invited you to join{" "}
            <strong>{invitation.organizationName}</strong> on ChartMind.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {currentUser
              ? "Click below to accept and join the organization."
              : "Sign in or create an account to get started."}
          </Typography>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleAcceptClick}
            sx={{ py: 1.5 }}
          >
            Accept Invitation
          </Button>
        </Box>
      </Box>
    );
  }

  // Step 2: Show signup/login flow
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        {accepting ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Setting up your account...
            </Typography>
          </Box>
        ) : (
          <AuthFlow
            preselectedRole="provider"
            prefilledEmail={invitation.email}
            skipProfileName={true}
            skipEmailVerification={true}
            onAfterAccountSetup={handlePostAccountSetup}
            skipSuccessStep={true}
            onSuccess={handleSignupComplete}
          />
        )}
      </Box>
    </Box>
  );
};

export default JoinPage;
