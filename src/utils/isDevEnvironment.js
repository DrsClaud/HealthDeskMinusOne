import firebaseApp from "services/firebase";

/**
 * True when running in a development/sandbox context.
 * Used to gate dev-only features (e.g. test auth, preview routes, MFA dev hints in enrollment).
 */
export const isDevEnvironment = () => {
  const projectId = firebaseApp.options.projectId;
  const isDevelopmentBuild = process.env.NODE_ENV === "development";
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const sandboxProjectIds = ["hlthdsk-sandbox-2cc23", "hlthdsk-experimental"];
  const isSandboxProject = sandboxProjectIds.includes(projectId);

  return isDevelopmentBuild || isLocalhost || isSandboxProject;
};

/**
 * Set to `true` to require MFA enrollment (onboarding, Settings, dashboard gate)
 * even in dev/sandbox — use when debugging MFA. Sign-in MFA challenge is unchanged.
 */
export const FORCE_MFA_ENROLLMENT_IN_DEV = false;

/**
 * When true, MFA enrollment UI and required-enrollment routing are skipped (fast iteration).
 * False when not in dev, or when {@link FORCE_MFA_ENROLLMENT_IN_DEV} is true.
 */
export const shouldSkipMfaEnrollmentUi = () =>
  isDevEnvironment() && !FORCE_MFA_ENROLLMENT_IN_DEV;
