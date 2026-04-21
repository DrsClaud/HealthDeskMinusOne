const { db } = require("../config/firebase");
const { differenceInHours } = require("date-fns");
const { calculateHlthdskScore } = require("../utils/locationProcessing");

/**
 * Creates a migration function to calculate and add hlthdsk_score to all location documents
 * The score consists of four components:
 * - rating_component: Based on the location's star rating (0-25)
 * - capabilities_component: Based on whether capabilities questions are answered (0-25)
 * - queue_component: Based on whether virtual queue is enabled (0 or 25)
 * - waiting_time_component: Based on recency of wait time updates (0-25)
 *   * Considers both past and future scheduled times
 *   * Uses gradual time decay for both past and future times
 *
 * ----------------------------------------------------------------------------
 * USAGE INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 *
 * 1. DEPLOYMENT:
 *    firebase deploy --only functions:migrateHlthdskScores
 *
 * 2. TESTING THE FUNCTION:
 *    - Test with 5 random documents (default):
 *      https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migrateHlthdskScores?test=true
 *
 *    - Test with specific number of documents:
 *      https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migrateHlthdskScores?test=true&limit=10
 *
 *    - Test mode returns calculations without making any changes to the database
 *
 * 3. RUNNING IN PRODUCTION:
 *    https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migrateHlthdskScores
 *
 * 4. UPDATING THE SCORING ALGORITHM:
 *    - Modify the calculation logic in this file
 *    - Redeploy the function
 *    - Run it again to update all scores
 * ----------------------------------------------------------------------------
 */
exports.createHlthdskScoreMigrationFunction = () => {
  return async (req, res) => {
    try {
      // Check for test mode parameter
      const testMode = req.query.test === "true";
      const limit = req.query.limit
        ? parseInt(req.query.limit)
        : testMode
        ? 5
        : null;

      console.log(
        `Running in ${testMode ? "TEST" : "PRODUCTION"} mode${
          limit ? ` with limit of ${limit} documents` : ""
        }`
      );

      // Get locations from Firestore
      let query = db.collection("locations");
      if (limit) {
        query = query.limit(limit);
      }
      const locationsSnapshot = await query.get();
      console.log(`Found ${locationsSnapshot.size} locations to process`);

      // Process in batches
      const batches = [];
      let batch = db.batch();
      let operationsCount = 0;
      const MAX_BATCH_SIZE = 500;

      // Track calculations for verification
      const calculationResults = [];

      for (const doc of locationsSnapshot.docs) {
        const locationData = doc.data();
        const locationRef = db.collection("locations").doc(doc.id);

        // Calculate rating component (0-25 points)
        const ratingComponent = locationData.rating
          ? Math.round((locationData.rating / 5) * 25)
          : 0;

        // Calculate capabilities component (0-25 points)
        let capabilitiesComponent = 0;
        const requiredCapabilities = ["xray", "ultrasound", "mri", "lab", "ct"];

        if (
          locationData.waitTimes &&
          Array.isArray(locationData.waitTimes) &&
          locationData.waitTimes.length > 0
        ) {
          // Find the most recent dashboard entry with capabilities
          const dashboardEntry = [...locationData.waitTimes]
            .sort((a, b) => (b.date || 0) - (a.date || 0))
            .find((time) => time && time.dashboard === true);

          // Check if any of the capability questions have been answered
          if (dashboardEntry) {
            const hasAnsweredAny = requiredCapabilities.some(
              (cap) =>
                dashboardEntry[cap] !== undefined &&
                dashboardEntry.dashboard === true
            );

            if (hasAnsweredAny) {
              capabilitiesComponent = 25;
            }
          }
        }

        // Calculate queue component (0 or 25 points)
        const queueComponent = locationData.queueEnabled === true ? 25 : 0;

        // Calculate waiting time component (0-25 points)
        let waitingTimeComponent = 0;
        if (locationData.waitTimes?.length > 0) {
          const now = Date.now();

          // Get all admin wait times, sorted by date
          const adminTimes = [...locationData.waitTimes]
            .filter((time) => time.admin && time.waitTime)
            .sort((a, b) => b.date - a.date);

          if (adminTimes.length > 0) {
            // Find the most recent past time and the next future time
            const pastTimes = adminTimes.filter((time) => time.date <= now);
            const futureTimes = adminTimes.filter((time) => time.date > now);

            const mostRecentPast = pastTimes[0];
            const nextFuture = futureTimes[futureTimes.length - 1];

            // Calculate score based on most recent past time
            if (mostRecentPast) {
              const hoursSinceUpdate = differenceInHours(
                now,
                mostRecentPast.date
              );

              if (hoursSinceUpdate <= 12) {
                waitingTimeComponent = 25;
              } else if (hoursSinceUpdate <= 24) {
                waitingTimeComponent = 18.75;
              } else if (hoursSinceUpdate <= 36) {
                waitingTimeComponent = 12.5;
              }
            }

            // If no recent past time or score is low, consider future time
            if (waitingTimeComponent < 25 && nextFuture) {
              const hoursUntilFuture = differenceInHours(nextFuture.date, now);

              if (hoursUntilFuture <= 12) {
                waitingTimeComponent = Math.max(waitingTimeComponent, 25);
              } else if (hoursUntilFuture <= 24) {
                waitingTimeComponent = Math.max(waitingTimeComponent, 18.75);
              } else if (hoursUntilFuture <= 36) {
                waitingTimeComponent = Math.max(waitingTimeComponent, 12.5);
              }
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

        // Create hlthdsk_score object
        const hlthdskScore = {
          rating_component: ratingComponent,
          capabilities_component: capabilitiesComponent,
          queue_component: queueComponent,
          waiting_time_component: waitingTimeComponent,
          total: totalScore,
        };

        // In test mode, just collect the results without making changes
        if (testMode) {
          calculationResults.push({
            id: doc.id,
            title: locationData.title || "Unnamed Location",
            current: locationData.hlthdsk_score,
            calculated: hlthdskScore,
            inputs: {
              rating: locationData.rating,
              queueEnabled: locationData.queueEnabled,
              hasCapabilities: capabilitiesComponent > 0,
              capabilities:
                locationData.waitTimes && locationData.waitTimes.length > 0
                  ? locationData.waitTimes
                      .sort((a, b) => b.date - a.date)
                      .find((time) => time.dashboard) || {}
                  : {},
              waitTimes: {
                past: locationData.waitTimes?.filter(
                  (time) => time.date <= Date.now()
                ),
                future: locationData.waitTimes?.filter(
                  (time) => time.date > Date.now()
                ),
                mostRecentPast:
                  locationData.waitTimes?.length > 0
                    ? locationData.waitTimes
                        .filter(
                          (time) =>
                            time.admin &&
                            time.waitTime &&
                            time.date <= Date.now()
                        )
                        .sort((a, b) => b.date - a.date)[0]
                    : null,
                nextFuture:
                  locationData.waitTimes?.length > 0
                    ? locationData.waitTimes
                        .filter(
                          (time) =>
                            time.admin &&
                            time.waitTime &&
                            time.date > Date.now()
                        )
                        .sort((a, b) => a.date - b.date)[0]
                    : null,
              },
            },
          });
          continue;
        }

        // Add update operation to batch
        batch.update(locationRef, { hlthdsk_score: hlthdskScore });
        operationsCount++;

        // Commit batch if it reaches maximum size
        if (operationsCount === MAX_BATCH_SIZE) {
          batches.push(batch);
          batch = db.batch();
          operationsCount = 0;
        }
      }

      // In test mode, return the calculation results without making changes
      if (testMode) {
        return res.json({
          success: true,
          testMode: true,
          documentCount: calculationResults.length,
          calculationResults,
        });
      }

      // Commit final batch if it has any operations
      if (operationsCount > 0) {
        batches.push(batch);
      }

      // Execute all batches
      console.log(`Executing ${batches.length} batches...`);
      await Promise.all(batches.map((batch) => batch.commit()));

      res.json({
        success: true,
        message: `Successfully added hlthdsk_score to ${locationsSnapshot.size} locations`,
      });
    } catch (error) {
      console.error("My HealthDesk score migration failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
};
