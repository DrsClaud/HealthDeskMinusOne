const path = require("path");
const admin = require("firebase-admin");

const credPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "..", "firebase-creds.json");
// Local-only: file is gitignored; do not commit credentials into this repo.
var serviceAccount = require(credPath);

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
if (!accountSid || !authToken) {
  throw new Error(
    "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for local test_express."
  );
}
const twilio = require("twilio")(accountSid, authToken);

// if (process.env.NODE_ENV === "production") {
//   admin.analytics();
// }

let firebase_test = require("./backend/server.js");

// console.log(firebase_test);
var app = firebase_test.CreateApiServer(admin, twilio, {
  phone: "+1 866 714 7775",
});
const port = 5000;
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  // console.log(`Enviornment: ${JSON.stringify(process.env, null, 2)}`);
});
