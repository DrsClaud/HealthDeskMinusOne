const { db } = require("../config/firebase");
const {
  getLocationsNeedingScoreUpdate,
  calculateHlthdskScore,
} = require("../utils/locationProcessing");

// Keep admin wait times for only 7 days
const ADMIN_RETENTION_DAYS = 7;
const USER_RETENTION_DAYS = 3;

/**
 * Combined function that:
 * 1. Updates hlthdsk_scores based on time decay boundaries
 * 2. Cleans up old wait times to reduce document size
 * 3. Activates future scheduled times that have become current
 */
exports.updateScoresAndCleanup = async (context) => {
  const startTime = Date.now();
  const functionId = `function-${startTime}`; // Unique ID for tracking this execution

  console.log(`[${functionId}] Starting combined score update and cleanup`);

  try {
    // STEP 1: Get locations that need score updates
    console.log(`[${functionId}] Fetching locations needing score updates...`);
    const locationsToUpdate = await getLocationsNeedingScoreUpdate(db);

    console.log(
      `[${functionId}] Found ${locationsToUpdate.length} locations that need score updates`
    );

    // STEP 2: Update scores if needed
    if (locationsToUpdate.length > 0) {
      await updateScores(locationsToUpdate, functionId);
    } else {
      console.log(
        `[${functionId}] No locations need score updates at this time`
      );
    }

    // STEP 3: Run cleanup every 12 function executions (approximately once per 12 hours)
    // This ensures we don't clean up too frequently but still do it regularly
    const currentHour = new Date().getHours();
    if (currentHour === 3 || currentHour === 15) {
      // Run at 3 AM and 3 PM
      console.log(
        `[${functionId}] Performing wait time cleanup at ${currentHour}:00`
      );
      await cleanupWaitTimes(functionId);
    } else {
      console.log(`[${functionId}] Skipping cleanup at hour ${currentHour}`);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    console.log(
      `[${functionId}] Completed combined function in ${executionTime.toFixed(
        2
      )} seconds`
    );

    return null;
  } catch (error) {
    console.error(`[${functionId}] Error in combined function:`, error);
    throw error;
  }
};

/**
 * Updates scores for locations that need it
 * @param {Array} locationsToUpdate - Array of location data
 * @param {string} functionId - Identifier for the function execution
 */
async function updateScores(locationsToUpdate, functionId) {
  // Update each location in a batch
  const batchSize = 100; // Reduced from 500 to avoid timeouts
  let batchCount = 0;
  let updateCount = 0;
  const now = Date.now();

  console.log(
    `[${functionId}] Starting batched score updates for ${locationsToUpdate.length} locations`
  );

  // Process in batches to avoid overwhelming Firestore
  for (let i = 0; i < locationsToUpdate.length; i += batchSize) {
    const batch = db.batch();
    const batchLocations = locationsToUpdate.slice(i, i + batchSize);

    console.log(
      `[${functionId}] Processing batch ${batchCount + 1} with ${
        batchLocations.length
      } locations`
    );

    batchLocations.forEach((location) => {
      const hlthdskScore = calculateHlthdskScore(location.data);

      // Update the score and store the timestamp when it was last calculated
      batch.update(location.ref, {
        hlthdsk_score: hlthdskScore,
        lastScoreUpdate: now,
      });

      updateCount++;
    });

    await batch.commit();
    console.log(
      `[${functionId}] Batch ${batchCount + 1} committed successfully`
    );
    batchCount++;
  }

  console.log(
    `[${functionId}] Updated scores for ${updateCount} locations in ${batchCount} batches`
  );
}

/**
 * Cleans up old wait times to reduce document size
 * @param {string} functionId - Identifier for the function execution
 */
async function cleanupWaitTimes(functionId) {
  // Get timestamp for cutoff dates
  const adminCutoffTime =
    Date.now() - ADMIN_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const userCutoffTime = Date.now() - USER_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  console.log(
    `[${functionId}] Removing wait times: admin older than ${new Date(
      adminCutoffTime
    ).toISOString()}, user older than ${new Date(userCutoffTime).toISOString()}`
  );

  // Query for locations with waitTimes - use a cursor approach to handle many locations
  let lastDoc = null;
  let batchesProcessed = 0;
  let totalLocationsUpdated = 0;
  let totalTimesRemoved = 0;
  const batchSize = 50; // Smaller batches for cleanup

  console.log(
    `[${functionId}] Starting batched cleanup process with batch size ${batchSize}`
  );

  // Process locations in batches to avoid running too long
  for (let i = 0; i < 5; i++) {
    // Limit to 5 batches per execution to avoid timeouts
    let query = db
      .collection("locations")
      .where("waitTimes", "!=", null)
      .limit(batchSize);

    // Use cursor if we have a last document
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`[${functionId}] No more locations found with wait times`);
      break;
    }

    // Track stats
    let locationsUpdated = 0;
    let timesRemoved = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const locationData = doc.data();

      if (!locationData.waitTimes || !locationData.waitTimes.length) {
        return;
      }

      // Filter out old wait times
      const originalCount = locationData.waitTimes.length;
      const newWaitTimes = locationData.waitTimes.filter((time) => {
        // Keep scheduled future times
        if (time.scheduled && time.date > Date.now()) return true;

        // Keep very recent admin times regardless
        const isVeryRecent = time.date > Date.now() - 24 * 60 * 60 * 1000;
        if (time.admin && isVeryRecent) return true;

        // Keep admin times more recent than admin cutoff
        if (time.admin && time.date > adminCutoffTime) return true;

        // Keep non-admin times more recent than user cutoff
        if (!time.admin && time.date > userCutoffTime) return true;

        // Remove everything else
        return false;
      });

      // Only update if we removed any wait times
      if (newWaitTimes.length < originalCount) {
        batch.update(doc.ref, { waitTimes: newWaitTimes });
        locationsUpdated++;
        timesRemoved += originalCount - newWaitTimes.length;
      }

      // Update last doc for cursor
      lastDoc = doc;
    });

    // Commit batch if we have any updates
    if (locationsUpdated > 0) {
      await batch.commit();
      console.log(
        `[${functionId}] Batch ${
          batchesProcessed + 1
        }: Removed ${timesRemoved} old wait times from ${locationsUpdated} locations`
      );

      totalLocationsUpdated += locationsUpdated;
      totalTimesRemoved += timesRemoved;
    } else {
      console.log(
        `[${functionId}] Batch ${
          batchesProcessed + 1
        }: No wait times needed to be removed`
      );
    }

    batchesProcessed++;
  }

  console.log(
    `[${functionId}] Cleanup complete: Removed ${totalTimesRemoved} old wait times from ${totalLocationsUpdated} locations across ${batchesProcessed} batches`
  );
}
