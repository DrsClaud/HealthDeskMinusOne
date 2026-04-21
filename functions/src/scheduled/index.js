const functions = require("firebase-functions");
const { updateScoresAndCleanup } = require("./updateScoresAndCleanup");
const { openaiHealthCheck } = require("./openaiHealthCheck");
const { sendComplianceOverdueReminders } = require("./complianceReminders");
const { runtimeConfigSecret } = require("../runtimeConfig");

module.exports = {
  // Combined function for score updates and cleanup, runs hourly
  updateScoresAndCleanup: functions.pubsub
    .schedule("every 1 hours")
    .onRun(updateScoresAndCleanup),

  // OpenAI API health monitoring, runs every hour on the hour
  openaiHealthCheck: functions
    .runWith({ timeoutSeconds: 120, secrets: [runtimeConfigSecret] }) // 2 minutes timeout
    .pubsub.schedule("0 * * * *")
    .onRun(openaiHealthCheck),

  // HIPAA compliance reminder dispatch, daily at 8:05 AM CT (13:05 UTC).
  sendComplianceOverdueReminders: functions
    .runWith({ secrets: [runtimeConfigSecret] })
    .pubsub.schedule("5 13 * * *")
    .onRun(sendComplianceOverdueReminders),
};
