import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, IconButton, Link as MuiLink, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useAuth } from "hooks/useAuth";
import useMfaStatus from "hooks/useMfaStatus";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { db } from "services/firebase";
import logoIcon from "assets/images/logos/logo-icon.png";
import Loading from "components/Loading";
import AccountSetupFlow, { ACCOUNT_SETUP_STEPS } from "./AccountSetupFlow";
import MfaEnrollSteps from "./MfaEnrollSteps";
import ReauthDialog from "./ReauthDialog";
import { shouldSkipMfaEnrollmentUi } from "utils/isDevEnvironment";

/**
 * Onboarding page - For users who have Firebase Auth but need to complete profile setup
 *
 * Uses the shared AccountSetupFlow component for the actual form steps.
 * Supports ?role=patient|provider|facility param to pre-select account type.
 */
const Onboarding = () => {
  const { user, userData, userLoading, logout } = useAuth();
  const { isEnrolled, sessionMfaLoading } = useMfaStatus();
  const [searchParams] = useSearchParams();
  const pendingInviteToken = sessionStorage.getItem(
    "pendingOrganizationInviteToken",
  );
  const preselectedRole =
    searchParams.get("role") || (pendingInviteToken ? "provider" : null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [step, setStep] = useState(ACCOUNT_SETUP_STEPS.ACCOUNT_TYPE);
  const [isOnSuccessStep, setIsOnSuccessStep] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probedUserData, setProbedUserData] = useState(undefined);
  const [emailVerifiedRefreshLoading, setEmailVerifiedRefreshLoading] =
    useState(false);
  const [emailVerifiedOverride, setEmailVerifiedOverride] = useState(null);
  /** Blocks auto-redirect until AccountSetupFlow finishes commit (state so effects re-run when cleared). */
  const [signupInProgress, setSignupInProgress] = useState(false);
  const pendingReauthActionRef = useRef(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const navigate = useNavigate();
  const backHandlerRef = useRef(null);
  const effectiveUserData = userData === undefined ? probedUserData : userData;
  const effectiveEmailVerified =
    emailVerifiedOverride === null
      ? !!user?.emailVerified
      : emailVerifiedOverride;
  const needsAccountSetup =
    !effectiveUserData?.role || effectiveUserData?.onboarding === true;
  const needsMfaEnrollment =
    !!user && !isEnrolled && !shouldSkipMfaEnrollmentUi();

  // Resolve the "undefined userData" ambiguity: still loading vs missing doc.
  useEffect(() => {
    let cancelled = false;
    const refreshEmailVerified = async () => {
      if (!user) {
        setEmailVerifiedOverride(null);
        return;
      }
      if (user.emailVerified) {
        setEmailVerifiedOverride(true);
        return;
      }
      setEmailVerifiedRefreshLoading(true);
      try {
        await firebase.auth().currentUser?.reload();
        if (cancelled) return;
        setEmailVerifiedOverride(!!firebase.auth().currentUser?.emailVerified);
      } catch (err) {
        if (cancelled) return;
        setEmailVerifiedOverride(!!user.emailVerified);
      } finally {
        if (!cancelled) setEmailVerifiedRefreshLoading(false);
      }
    };
    refreshEmailVerified();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const probeUserDoc = async () => {
      if (!user || userData !== undefined) {
        setProbeLoading(false);
        setProbedUserData(undefined);
        return;
      }
      setProbeLoading(true);
      try {
        const snap = await db.collection("users").doc(user.uid).get();
        if (cancelled) return;
        setProbedUserData(snap.exists ? snap.data() : null);
      } catch (err) {
        if (cancelled) return;
        // Fail-open: avoid deadlock by allowing onboarding to continue.
        setProbedUserData(null);
      } finally {
        if (!cancelled) setProbeLoading(false);
      }
    };
    probeUserDoc();
    return () => {
      cancelled = true;
    };
  }, [user, userData]);

  // Check auth state and redirect if needed
  useEffect(() => {
    if (
      userLoading ||
      sessionMfaLoading ||
      probeLoading ||
      emailVerifiedRefreshLoading
    )
      return;

    if (user) {
      if (!effectiveEmailVerified) {
        navigate("/auth");
        return;
      }
      if (
        !needsAccountSetup &&
        !needsMfaEnrollment &&
        !signupInProgress
      ) {
        navigate("/dashboard");
        return;
      }
      setLoading(false);
    } else {
      // No authenticated user - redirect to auth
      navigate("/auth");
    }
  }, [
    navigate,
    needsAccountSetup,
    needsMfaEnrollment,
    signupInProgress,
    sessionMfaLoading,
    probeLoading,
    emailVerifiedRefreshLoading,
    effectiveEmailVerified,
    user,
    userData,
    userLoading,
  ]);

  const handleComplete = async () => {
    if (!pendingInviteToken) return;
    const acceptInvitation = firebase
      .functions()
      .httpsCallable("acceptInvitation");
    try {
      await acceptInvitation({ token: pendingInviteToken });
      sessionStorage.removeItem("pendingOrganizationInviteToken");
    } catch (err) {
      const code = err?.code || "";
      const message = (err?.message || "").toLowerCase();
      const isTerminal =
        code.includes("already-exists") ||
        code.includes("permission-denied") ||
        code.includes("not-found") ||
        (code.includes("failed-precondition") &&
          (message.includes("accepted") ||
            message.includes("revoked") ||
            message.includes("expired") ||
            message.includes("different email") ||
            message.includes("organization")));
      if (isTerminal) {
        sessionStorage.removeItem("pendingOrganizationInviteToken");
        return;
      }
      throw err;
    }
  };

  const handleBack = () => {
    backHandlerRef.current?.();
  };

  if (loading || probeLoading || emailVerifiedRefreshLoading)
    return <Loading page />;

  // Account setup done and MFA not required — brief state before navigate to dashboard
  if (!needsAccountSetup && !needsMfaEnrollment) {
    return <Loading page />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 4,
      }}
    >
      {/* Logo */}
      <Box
        component="img"
        src={logoIcon}
        alt="HealthDesk"
        sx={{ height: 48, mb: 4 }}
      />

      {/* Main content container */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          mx: "auto",
          px: 3,
        }}
      >
        {/* Back button - only during account setup flow */}
        {needsAccountSetup &&
          step !== ACCOUNT_SETUP_STEPS.ACCOUNT_TYPE &&
          !isOnSuccessStep && (
            <Box sx={{ mb: 2 }}>
              <IconButton onClick={handleBack} edge="start" sx={{ ml: -1 }}>
                <ArrowBack />
              </IconButton>
            </Box>
          )}

        {needsAccountSetup ? (
          <AccountSetupFlow
            onComplete={handleComplete}
            onStepChange={setStep}
            backHandlerRef={backHandlerRef}
            preselectedRole={preselectedRole}
            onSignupStart={() => setSignupInProgress(true)}
            onSignupEnd={() => setSignupInProgress(false)}
            onSuccessStep={setIsOnSuccessStep}
          />
        ) : (
          <MfaEnrollSteps
            onDone={() => navigate("/dashboard")}
            onRequireReauth={(retryFn) => {
              pendingReauthActionRef.current = retryFn;
              setReauthOpen(true);
            }}
          />
        )}

        {/* Footer with logout - hide on success step */}
        {!isOnSuccessStep && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 4, textAlign: "center", display: "block" }}
          >
            <MuiLink
              component="button"
              variant="caption"
              onClick={async () => {
                setLogoutLoading(true);
                try {
                  await logout();
                  navigate("/");
                } catch (err) {
                  console.error("Logout error:", err);
                  setLogoutLoading(false);
                }
              }}
              disabled={logoutLoading}
              sx={{ verticalAlign: "baseline" }}
            >
              {logoutLoading ? "Logging out..." : "Log out"}
            </MuiLink>
          </Typography>
        )}
      </Box>
      <ReauthDialog
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={async () => {
          const action = pendingReauthActionRef.current;
          pendingReauthActionRef.current = null;
          setReauthOpen(false);
          if (action) await action();
        }}
      />
    </Box>
  );
};

export default Onboarding;
