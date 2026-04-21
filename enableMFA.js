/**
 * One-time script to enable TOTP MFA at the project level via Firebase Admin SDK.
 *
 * Prerequisites:
 *   1. Authenticate: gcloud auth application-default login
 *   2. Run from functions/ directory (where firebase-admin lives):
 *        cd functions && node ../enableMFA.js
 *
 * Pass the project ID via env var or edit PROJECT_ID below:
 *   FIREBASE_PROJECT_ID=hlthdsk-sandbox-2cc23 node ../enableMFA.js
 */

const admin = require("firebase-admin");

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.REACT_APP_FIREBASE_PROJECT_ID ||
  "hlthdsk"; // fallback to sandbox

admin.initializeApp({ projectId: PROJECT_ID });

admin
  .auth()
  .projectConfigManager()
  .updateProjectConfig({
    multiFactorConfig: {
      providerConfigs: [
        {
          state: "ENABLED",
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    },
  })
  .then(() => {
    console.log("✓ TOTP MFA enabled successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Failed to enable TOTP MFA:", err.message);
    process.exit(1);
  });
