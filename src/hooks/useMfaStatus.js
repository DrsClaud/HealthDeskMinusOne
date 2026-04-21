import { useState, useEffect } from "react";
import { useAuth } from "hooks/useAuth";

/**
 * useMfaStatus - Returns the current user's MFA enrollment and session state.
 *
 * isEnrolled        {boolean} - User has at least one MFA factor enrolled.
 * hasTOTP           {boolean} - User has a TOTP (authenticator app) factor.
 * hasSMS            {boolean} - User has an SMS factor.
 * enrolledFactors   {Array}   - Raw Firebase MultiFactorInfo array.
 *
 * sessionMfaVerified {boolean|null} - Whether the user completed an MFA
 *   challenge during the current sign-in session. null while loading.
 *   Determined by the `sign_in_second_factor` claim in the Firebase ID token.
 *   NOTE: This is false if the user enrolled MFA during the current session
 *   without signing out — they'll need to re-authenticate to get the claim set.
 *
 * sessionMfaLoading {boolean} - True while the ID token is being fetched.
 *
 * Usage for gating:
 *   const { isEnrolled, sessionMfaVerified, sessionMfaLoading } = useMfaStatus();
 *   if (!isEnrolled)          → prompt enrollment
 *   if (!sessionMfaVerified)  → prompt re-auth (or just sign-out/in)
 *   if (isEnrolled && sessionMfaVerified) → allow access
 */
const useMfaStatus = () => {
  const { user } = useAuth();
  const [sessionMfaVerified, setSessionMfaVerified] = useState(null);

  const enrolledFactors = user?.multiFactor?.enrolledFactors ?? [];
  const isEnrolled = enrolledFactors.length > 0;

  useEffect(() => {
    if (!user) {
      setSessionMfaVerified(false);
      return;
    }

    // Force-refresh the ID token so we get the latest claims
    user
      .getIdTokenResult(true)
      .then((result) => {
        // Firebase sets sign_in_second_factor when an MFA challenge was
        // completed during the sign-in that produced this session
        const secondFactor = result.claims?.firebase?.sign_in_second_factor;
        setSessionMfaVerified(!!secondFactor);
      })
      .catch(() => setSessionMfaVerified(false));
  }, [user]);

  return {
    isEnrolled,
    hasTOTP: enrolledFactors.some((f) => f.factorId === "totp"),
    hasSMS: enrolledFactors.some((f) => f.factorId === "phone"),
    enrolledFactors,
    sessionMfaVerified,
    sessionMfaLoading: sessionMfaVerified === null,
  };
};

export default useMfaStatus;
