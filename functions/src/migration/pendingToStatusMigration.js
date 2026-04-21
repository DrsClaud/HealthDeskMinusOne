const { db } = require("../config/firebase");
const admin = require("firebase-admin");

/**
 * Creates a migration function to convert the pending field (boolean/string) to status field (string enum)
 *
 * Status values:
 * - "pending": Location is waiting for approval
 * - "approved": Location is approved and visible
 * - "rejected": Location has been rejected
 *
 * ----------------------------------------------------------------------------
 * USAGE INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 *
 * 1. DEPLOYMENT:
 *    firebase deploy --only functions:migratePendingToStatus
 *
 * 2. TESTING THE FUNCTION:
 *    - Test with 5 random documents (default):
 *      https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migratePendingToStatus?test=true
 *
 *    - Test with specific number of documents:
 *      https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migratePendingToStatus?test=true&limit=10
 *
 *    - Test mode returns calculations without making any changes to the database
 *
 * 3. RUNNING IN PRODUCTION:
 *    https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migratePendingToStatus
 * ----------------------------------------------------------------------------
 */
exports.createPendingToStatusMigrationFunction = () => {
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

      // Track results for verification
      const migrationResults = [];

      for (const doc of locationsSnapshot.docs) {
        const locationData = doc.data();
        const locationRef = db.collection("locations").doc(doc.id);

        // Check if document has a pending field but no status field
        if (
          locationData.pending !== undefined &&
          locationData.status === undefined
        ) {
          let status;

          // Convert the pending field to a status string
          if (locationData.pending === true) {
            status = "pending";
          } else if (locationData.pending === "rejected") {
            status = "rejected";
          } else {
            status = "approved";
          }

          // In test mode, just collect the results without making changes
          if (testMode) {
            migrationResults.push({
              id: doc.id,
              title: locationData.title || "Unnamed Location",
              current: {
                pending: locationData.pending,
                status: locationData.status,
              },
              new: {
                status: status,
              },
            });
            continue;
          }

          // Add update operation to batch
          batch.update(locationRef, {
            status: status,
            pending: admin.firestore.FieldValue.delete(),
          });
          operationsCount++;

          // Commit batch if it reaches maximum size
          if (operationsCount === MAX_BATCH_SIZE) {
            batches.push(batch);
            batch = db.batch();
            operationsCount = 0;
          }
        }
      }

      // In test mode, return the migration results without making changes
      if (testMode) {
        return res.json({
          success: true,
          testMode: true,
          documentCount: migrationResults.length,
          migrationResults,
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
        message: `Successfully migrated pending to status field for ${operationsCount} locations`,
      });
    } catch (error) {
      console.error("Pending to status migration failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
};
