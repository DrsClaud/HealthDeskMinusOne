const { db } = require("../config/firebase");
const { calculateHlthdskScore } = require("../utils/locationProcessing");

/**
 * Cloud Function that triggers when a location's waitTimes array is updated
 * Recalculates the hlthdsk_score based on the latest wait time data
 */
exports.updateHlthdskScore = async (change, context) => {
  try {
    const locationData = change.after.data();
    const locationRef = change.after.ref;

    // Only proceed if waitTimes exists and has been modified
    if (!locationData.waitTimes) return null;

    // Check if the waitTimes array actually changed
    const before = change.before.data();
    if (
      before.waitTimes &&
      JSON.stringify(before.waitTimes) ===
        JSON.stringify(locationData.waitTimes)
    ) {
      return null;
    }

    // Calculate new score
    const hlthdskScore = calculateHlthdskScore(locationData);

    // Update the document with new score and lastScoreUpdate timestamp
    await locationRef.update({
      hlthdsk_score: hlthdskScore,
      lastScoreUpdate: Date.now(),
    });

    return null;
  } catch (error) {
    console.error("Error updating My HealthDesk score:", error);
    throw error;
  }
};
