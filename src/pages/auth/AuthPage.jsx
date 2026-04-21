import React, { useState, useRef, useEffect } from "react";
import {
  Navigate,
  useSearchParams,
  Link as RouterLink,
} from "react-router-dom";
import { Box, Link, Typography } from "@mui/material";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/functions";
import { useAuth } from "hooks/useAuth";
import useMfaStatus from "hooks/useMfaStatus";
import Loading from "components/Loading";
import AuthFlow, { STEPS } from "components/auth/AuthFlow";
import logoIcon from "assets/images/logos/logo-icon.png";
import { shouldSkipMfaEnrollmentUi } from "utils/isDevEnvironment";

/**
 * AuthPage - Unified sign-in / sign-up page (email, Google, Apple).
 *
 * Supports ?role=patient|provider|facility param to pre-select account type.
 * When fully signed in (role, onboarding done, email verified), redirects to
 * dashboard, or in prod to onboarding if MFA is not yet enrolled.
 */
const AuthPage = () => {
  const { user, userData, userLoading } = useAuth();
  const { isEnrolled, sessionMfaLoading } = useMfaStatus();
  const [searchParams] = useSearchParams();
  const preselectedRole = searchParams.get("role");

  const signupInProgressRef = useRef(false);
  const inviteAcceptingRef = useRef(false);
  const [inviteAccepting, setInviteAccepting] = useState(false);
  const [inviteTokenCleared, setInviteTokenCleared] = useState(false);
  const [invitePrefilledEmail, setInvitePrefilledEmail] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(
    Boolean(sessionStorage.getItem("pendingOrganizationInviteToken")),
  );
  const [emailVerifiedRefreshLoading, setEmailVerifiedRefreshLoading] = useState(false);
  const [emailVerifiedOverride, setEmailVerifiedOverride] = useState(null);
  const [isOnSuccessStep, setIsOnSuccessStep] = useState(false);
  const pendingInviteToken =
    !inviteTokenCleared
      ? sessionStorage.getItem("pendingOrganizationInviteToken")
      : null;
  const effectiveEmailVerified =
    emailVerifiedOverride === null ? !!user?.emailVerified : emailVerifiedOverride;

  useEffect(() => {
    let cancelled = false;

    const refreshEmailVerified = async () => {
      if (!user || invitePrefilledEmail) {
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
  }, [user, invitePrefilledEmail]);

  const acceptInviteForCurrentUser = async () => {
    if (!pendingInviteToken) return;
    const acceptInvitation = firebase.functions().httpsCallable("acceptInvitation");
    try {
      await acceptInvitation({ token: pendingInviteToken });
      sessionStorage.removeItem("pendingOrganizationInviteToken");
      setInviteTokenCleared(true);
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
        setInviteTokenCleared(true);
      } else {
        throw err;
      }
    }
  };

  useEffect(() => {
    const loadInviteContext = async () => {
      if (!pendingInviteToken || user) {
        setInviteLoading(false);
        return;
      }
      setInviteLoading(true);
      try {
        const getInvitation = firebase.functions().httpsCallable("getInvitation");
        const result = await getInvitation({ token: pendingInviteToken });
        const invitedEmail = result?.data?.invitation?.email || null;
        if (invitedEmail) setInvitePrefilledEmail(invitedEmail);
      } catch (err) {
        // Token is stale/invalid; clear it so auth works normally.
        sessionStorage.removeItem("pendingOrganizationInviteToken");
        setInviteTokenCleared(true);
      } finally {
        setInviteLoading(false);
      }
    };

    loadInviteContext();
  }, [pendingInviteToken, user]);

  useEffect(() => {
    const acceptPendingInvite = async () => {
      if (!pendingInviteToken || !user || !userData) return;
      if (inviteAcceptingRef.current) return;

      // Nothing to do once user is already in an org.
      if (userData.organizationId) {
        sessionStorage.removeItem("pendingOrganizationInviteToken");
        setInviteTokenCleared(true);
        return;
      }

      // Wait until account setup is done and role is set.
      if (userData.onboarding || userData.role !== "professional") return;

      inviteAcceptingRef.current = true;
      setInviteAccepting(true);
      try {
        await acceptInviteForCurrentUser();
      } catch (err) {
        // Keep token for retry path below.
      } finally {
        inviteAcceptingRef.current = false;
        setInviteAccepting(false);
      }
    };

    acceptPendingInvite();
  }, [pendingInviteToken, user, userData]);

  if (
    user &&
    userData?.role &&
    !userData?.onboarding &&
    (isEnrolled || shouldSkipMfaEnrollmentUi()) &&
    effectiveEmailVerified &&
    !signupInProgressRef.current
  ) {
    return <Navigate to="/dashboard" />;
  }

  const shouldShowLoading =
    userLoading ||
    inviteLoading ||
    inviteAccepting ||
    (user && (sessionMfaLoading || emailVerifiedRefreshLoading));

  if (shouldShowLoading) {
    return <Loading page />;
  }

  const shouldRequireEmailVerification =
    user &&
    !effectiveEmailVerified &&
    !invitePrefilledEmail &&
    !signupInProgressRef.current;

  const initialStep = shouldRequireEmailVerification ? STEPS.EMAIL_VERIFY : undefined;

  if (
    user &&
    !shouldRequireEmailVerification &&
    !signupInProgressRef.current
  ) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 4,
      }}
    >
      {isOnSuccessStep ? (
        <Box
          component="img"
          src={logoIcon}
          alt="HealthDesk"
          sx={{ height: 48, mb: 2 }}
        />
      ) : (
        <Link component={RouterLink} to="/">
          <Box
            component="img"
            src={logoIcon}
            alt="HealthDesk"
            sx={{ height: 48, mb: 2 }}
          />
        </Link>
      )}

      <AuthFlow
        preselectedRole={preselectedRole}
        prefilledEmail={invitePrefilledEmail || (shouldRequireEmailVerification ? user?.email : null)}
        disableOAuth={!!invitePrefilledEmail}
        skipEmailVerification={!!invitePrefilledEmail}
        initialStep={initialStep}
        onSignupStart={() => {
          signupInProgressRef.current = true;
        }}
        onSuccessStep={setIsOnSuccessStep}
      />

      {!isOnSuccessStep && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, mb: 4, textAlign: "center" }}
        >
          <Link component={RouterLink} to="/" color="inherit" underline="hover">
            Back to CareMap
          </Link>
        </Typography>
      )}
    </Box>
  );
};

export default AuthPage;
