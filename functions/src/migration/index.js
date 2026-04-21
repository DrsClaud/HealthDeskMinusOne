const functions = require("firebase-functions");
const { admin } = require("../config/firebase");
const { createGeoMigrationFunction } = require("./geoMigration");
const { createRatingMigrationFunction } = require("./ratingMigration");
const { createLocationsMigrationFunction } = require("./locationsMigration");
const {
  createHlthdskScoreMigrationFunction,
} = require("./hlthdskScoreMigration");
const {
  createPendingToStatusMigrationFunction,
} = require("./pendingToStatusMigration");
const {
  createCapabilitiesMigrationFunction,
} = require("./capabilitiesMigration");
const { populateSubscriptionStatus } = require("./populateSubscriptionStatus");

exports.migrateRatings = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(createRatingMigrationFunction());

exports.migrateToGeoFirestore = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(createGeoMigrationFunction());

exports.migrateHlthdskScores = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(createHlthdskScoreMigrationFunction());

exports.migratePendingToStatus = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(createPendingToStatusMigrationFunction());

exports.migrateCapabilities = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(createCapabilitiesMigrationFunction());

exports.migrateLocations = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(createLocationsMigrationFunction());

exports.populateSubscriptionStatus = populateSubscriptionStatus;

exports.verifyEmail = functions.https.onRequest(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    res.status(400).send("Please provide an email parameter");
    return;
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, {
      emailVerified: true,
    });

    res.send(`Email ${email} verified successfully!`);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});
