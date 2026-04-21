const { differenceInHours } = require("date-fns");

/**
 * Calculate My HealthDesk score based on facility capabilities and settings
 * The score consists of four components, each worth up to 25 points (total 100):
 *
 * 1. Rating Component (0-25 points)
 *    - Based on the facility's star rating (0-5 stars)
 *    - Linear scaling: (rating/5) * 25
 *
 * 2. Capabilities Component (0-25 points)
 *    - Based on enabled medical capabilities (lab, xray, ultrasound, ct, mri)
 *    - Each capability contributes equally to the total
 *    - Formula: (enabled_capabilities / total_capabilities) * 25
 *
 * 3. Queue Component (0 or 25 points)
 *    - Binary score based on whether virtual queue is enabled
 *    - 25 points if enabled, 0 if disabled
 *
 * 4. Waiting Time Component (0-25 points)
 *    - Based on predefined wait time steps: [30, 60, 120, 150, 180, 240, 360]
 *    - Score is calculated based on step position (1-7)
 *    - Lower step = higher score (30min = 25 points, 360min = 0 points)
 *    - Time decay multiplier:
 *      * 0-4 hours: 1.0x (full points)
 *      * 4-12 hours: 0.7x
 *      * 12-24 hours: 0.4x
 *      * 24+ hours: 0.1x
 *
 * @param {Object} locationData - The location document data
 * @param {boolean} [overrideQueueEnabled] - Optional override for the queueEnabled value
 * @returns {Object} The hlthdsk_score object with components and total
 */
const calculateHlthdskScore = (locationData, overrideQueueEnabled) => {
  // Rating component (0-25 points)
  const ratingComponent = locationData.rating
    ? Math.round((locationData.rating / 5) * 25)
    : 0;

  // Capabilities component (0-25 points)
  let capabilitiesComponent = 0;
  const capabilityFields = ["lab", "xray", "ultrasound", "ct", "mri"];

  // Check if capabilities field exists and calculate points
  if (locationData.capabilities) {
    const enabledCapabilities = capabilityFields.filter(
      (capability) => locationData.capabilities[capability] === true
    );

    // Calculate points based on how many capabilities are enabled
    if (enabledCapabilities.length > 0) {
      capabilitiesComponent = Math.round(
        (enabledCapabilities.length / capabilityFields.length) * 25
      );
    }
  }

  // Queue component (0 or 25 points)
  const queueEnabled =
    overrideQueueEnabled !== undefined
      ? overrideQueueEnabled
      : locationData.queueEnabled === true;
  const queueComponent = queueEnabled ? 25 : 0;

  // Waiting time component (0-25 points)
  let waitingTimeComponent = 0;
  if (locationData.waitTimes?.length > 0) {
    const now = Date.now();

    // Get all admin wait times, sorted by date
    const adminTimes = [...locationData.waitTimes]
      .filter((time) => time.admin && time.waitTime)
      .sort((a, b) => b.date - a.date);

    if (adminTimes.length > 0) {
      // Find the most recent past time
      const pastTimes = adminTimes.filter((time) => time.date <= now);
      const mostRecentPast = pastTimes[0];

      if (mostRecentPast) {
        const hoursSinceUpdate = differenceInHours(now, mostRecentPast.date);

        // Calculate time decay multiplier
        let timeDecayMultiplier = 0.1; // Default for 24+ hours
        if (hoursSinceUpdate <= 4) timeDecayMultiplier = 1.0;
        else if (hoursSinceUpdate <= 12) timeDecayMultiplier = 0.7;
        else if (hoursSinceUpdate <= 24) timeDecayMultiplier = 0.4;

        // Predefined wait time steps
        const waitTimeSteps = [30, 60, 120, 150, 180, 240, 360];
        const waitTime = parseInt(mostRecentPast.waitTime);

        // Find which step the wait time is on
        const stepIndex = waitTimeSteps.findIndex((step) => waitTime <= step);
        const stepPosition =
          stepIndex === -1 ? waitTimeSteps.length : stepIndex + 1;

        // Calculate score based on step position (1-7)
        // First step (30min) = 25 points, last step (360min) = 0 points
        const waitTimeScore = Math.max(
          0,
          25 * (1 - (stepPosition - 1) / (waitTimeSteps.length - 1))
        );

        // Apply time decay
        waitingTimeComponent = Math.round(waitTimeScore * timeDecayMultiplier);
      }
    }
  }

  // Calculate total score (capped at 100)
  const totalScore = Math.min(
    100,
    ratingComponent +
      capabilitiesComponent +
      queueComponent +
      waitingTimeComponent
  );

  return {
    rating_component: ratingComponent,
    capabilities_component: capabilitiesComponent,
    queue_component: queueComponent,
    waiting_time_component: waitingTimeComponent,
    total: Math.round(totalScore),
  };
};

/**
 * Helper function to determine if a location needs a score update based on time decay boundaries
 * @param {Object} locationData - The location document data
 * @returns {boolean} Whether the location needs a score update
 */
const needsScoreUpdate = (locationData) => {
  if (!locationData.waitTimes?.length) return false;

  const now = Date.now();

  // If the location has a lastScoreUpdate timestamp, check if it's been updated recently
  if (locationData.lastScoreUpdate) {
    const hoursSinceLastUpdate = differenceInHours(
      now,
      locationData.lastScoreUpdate
    );

    // If updated in the last hour, skip unless near a time boundary
    if (hoursSinceLastUpdate < 1) return false;
  }

  // Get the most recent admin time
  const adminTimes = [...locationData.waitTimes]
    .filter((time) => time.admin && time.waitTime)
    .sort((a, b) => b.date - a.date);

  if (!adminTimes.length) return false;

  // Find the most recent past time
  const pastTimes = adminTimes.filter((time) => time.date <= now);
  if (!pastTimes.length) return false;

  const mostRecentPast = pastTimes[0];
  const hoursSinceUpdate = differenceInHours(now, mostRecentPast.date);

  // Check if we're near a time decay boundary (4 hours, 12 hours, 24 hours)
  // Add a small buffer (0.1 hour = 6 minutes) to avoid missing updates
  if (
    (hoursSinceUpdate >= 3.9 && hoursSinceUpdate <= 4.1) ||
    (hoursSinceUpdate >= 11.9 && hoursSinceUpdate <= 12.1) ||
    (hoursSinceUpdate >= 23.9 && hoursSinceUpdate <= 24.1)
  ) {
    return true;
  }

  // Also check if we have any future scheduled times that have now become active
  const futureTimesNowActive = adminTimes.some(
    (time) =>
      time.scheduled &&
      time.date <= now &&
      (locationData.lastScoreUpdate
        ? time.date > locationData.lastScoreUpdate
        : true)
  );

  return futureTimesNowActive;
};

/**
 * Helper function to get locations that need a score update based on time decay
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @returns {Promise<Array>} Array of location documents that need updating
 */
const getLocationsNeedingScoreUpdate = async (db) => {
  // Get locations with admin wait times
  // We'll use a created time range from 4-25 hours ago to optimize query
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;

  // Query for one of these conditions:
  // 1. Locations with no lastScoreUpdate (never processed)
  // 2. Locations with lastScoreUpdate more than 1 hour ago but less than 25 hours ago
  // 3. Locations with recent wait time data between 4-25 hours ago
  const snapshot = await db
    .collection("locations")
    .where("waitTimes", "!=", null)
    .limit(200) // Process in smaller batches
    .get();

  const locationsToUpdate = [];

  snapshot.forEach((doc) => {
    const locationData = doc.data();
    if (needsScoreUpdate(locationData)) {
      locationsToUpdate.push({
        id: doc.id,
        ref: doc.ref,
        data: locationData,
      });
    }
  });

  return locationsToUpdate;
};

module.exports = {
  calculateHlthdskScore,
  needsScoreUpdate,
  getLocationsNeedingScoreUpdate,
};
