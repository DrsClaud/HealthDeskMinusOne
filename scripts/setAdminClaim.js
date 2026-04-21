/**
 * setAdminClaim.js
 *
 * Manually grant or revoke the Firebase "admin" custom claim on a user.
 * Custom claims are embedded in the user's JWT and checked in Firestore rules
 * as request.auth.token.admin — no Firestore read required.
 *
 * On --grant, also sets Firestore users.role to "global_admin" and users.admin
 * for consistency (Support, Usage Monitor gate, exports). The client trusts
 * the JWT claim for routing; role/admin fields are not required for that.
 * On --revoke, clears users.admin only; fix role manually if needed.
 *
 * Usage:
 *   node scripts/setAdminClaim.js --email user@example.com --grant
 *   node scripts/setAdminClaim.js --email user@example.com --revoke
 *   node scripts/setAdminClaim.js --uid abc123uid          --grant
 *
 * Requirements:
 *   - Install root dependencies first (`npm install` in the project root).
 *   - firebase-admin available from the root `node_modules`.
 *   - A service account key file. Default: firebase-creds.json in project root (gitignored).
 *     Override: set env GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-key.json
 *
 * How to get the service account key (firebase-creds.json):
 *   1. Open Firebase Console: https://console.firebase.google.com
 *   2. Select the project (must match the app's REACT_APP_FIREBASE_PROJECT_ID).
 *   3. Project settings (gear) → Service accounts.
 *   4. Click "Generate new private key" (or use an existing one).
 *   5. Save the downloaded JSON as firebase-creds.json in the project root.
 *   6. Do not commit it (it is in .gitignore). Rotate the key if it was ever committed.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "../firebase-creds.json");

if (!fs.existsSync(credPath)) {
  console.error("Service account key not found at:\n  " + credPath);
  console.error("\nFix one of:");
  console.error(
    "  1) Save your Firebase private key JSON as firebase-creds.json next to this repo root:",
  );
  console.error("     " + path.join(__dirname, "..", "firebase-creds.json"));
  console.error(
    "  2) Or set GOOGLE_APPLICATION_CREDENTIALS to the full path of that JSON, then re-run.",
  );
  console.error("\nScript directory (symlinks resolved): " + __dirname);
  process.exit(1);
}

const serviceAccount = require(credPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const projectId = serviceAccount.project_id;

// ----------------------------------------------------------------
// Parse args
// ----------------------------------------------------------------
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const email  = get("--email");
const uid    = get("--uid");
const grant  = args.includes("--grant");
const revoke = args.includes("--revoke");

if ((!email && !uid) || (!grant && !revoke)) {
  console.error("Usage:");
  console.error("  node scripts/setAdminClaim.js --email <email> --grant");
  console.error("  node scripts/setAdminClaim.js --email <email> --revoke");
  console.error("  node scripts/setAdminClaim.js --uid   <uid>   --grant");
  process.exit(1);
}

// ----------------------------------------------------------------
// Run
// ----------------------------------------------------------------
async function run() {
  // Resolve UID from email if needed
  let targetUid = uid;
  if (!targetUid) {
    const user = await admin.auth().getUserByEmail(email);
    targetUid = user.uid;
    console.log(`Resolved ${email} → uid: ${targetUid}`);
  }

  const claim = grant ? { admin: true } : { admin: false };
  await admin.auth().setCustomUserClaims(targetUid, claim);

  // Mirror to Firestore user doc for display purposes only (not trusted by rules)
  await admin.firestore().collection("users").doc(targetUid).update(
    grant
      ? { admin: true, role: "global_admin" }
      : { admin: false },
  );

  console.log(`\n✓ ${grant ? "Granted" : "Revoked"} admin claim for uid: ${targetUid}`);
  console.log(`  Project: ${projectId} (must match your app's REACT_APP_FIREBASE_PROJECT_ID)`);
  console.log("  The user must sign out and back in (or their token will refresh within 1 hour).");
  console.log("  To force immediate refresh, call: firebase.auth().currentUser.getIdToken(true)");
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
