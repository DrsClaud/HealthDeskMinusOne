const functions = require("firebase-functions");
const { updateHlthdskScore } = require("./updateHlthdskScore");
const { syncSubscriptionStatus } = require("./syncSubscriptionStatus");

module.exports = {
  updateHlthdskScore: functions.firestore
    .document("locations/{locationId}")
    .onUpdate(updateHlthdskScore),
  syncSubscriptionStatus,
};
