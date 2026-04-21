const { db } = require("../config/firebase");

/**
 * Creates a migration function to move capabilities from waitTimes to a dedicated field
 * and recalculate My HealthDesk scores based on the new capabilities model.
 * Also extracts customPhone to a top-level property and removes legacy fields.
 *
 * ----------------------------------------------------------------------------
 * USAGE INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 *
 * 1. DEPLOYMENT:
 *    firebase deploy --only functions:migrateCapabilities
 *
 * 2. TESTING THE FUNCTION:
 *    - Test with 5 random documents (default):
 *      https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migrateCapabilities?test=true
 *
 *    - Test with specific number of documents:
 *      https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migrateCapabilities?test=true&limit=10
 *
 *    - Test mode returns calculations without making any changes to the database
 *
 * 3. RUNNING IN PRODUCTION:
 *    https://[YOUR_REGION]-[YOUR_PROJECT_ID].cloudfunctions.net/migrateCapabilities
 * ----------------------------------------------------------------------------
 */
exports.createCapabilitiesMigrationFunction = () => {
  /**
   * Calculate My HealthDesk score based on facility capabilities and settings
   * @param {Object} locationData - The location document data
   * @returns {Object} The hlthdsk_score object with components and total
   */
  const calculateHlthdskScore = (locationData) => {
    // Rating component (0-33 points)
    const ratingComponent = locationData.rating
      ? Math.round((locationData.rating / 5) * 33)
      : 0;

    // Capabilities component (0-33 points)
    let capabilitiesComponent = 0;
    const capabilityFields = ["lab", "xray", "ultrasound", "ct", "mri"];

    // Check if capabilities field exists and calculate points
    if (locationData.capabilities) {
      const enabledCapabilities = capabilityFields.filter(
        (capability) => locationData.capabilities[capability] === true
      );

      // Calculate points based on how many capabilities are enabled (each worth 33/5 points)
      if (enabledCapabilities.length > 0) {
        capabilitiesComponent = Math.round(
          (enabledCapabilities.length / capabilityFields.length) * 33
        );
      }
    }

    // Queue component (0 or 33 points)
    const queueComponent = locationData.queueEnabled === true ? 33 : 0;

    // Calculate total score (capped at 100)
    const totalScore = Math.min(
      100,
      ratingComponent + capabilitiesComponent + queueComponent
    );

    return {
      rating_component: ratingComponent,
      capabilities_component: capabilitiesComponent,
      queue_component: queueComponent,
      total: totalScore,
    };
  };

  return async (req, res) => {
    try {
      // Check for test mode parameter
      const testMode = req.query.test === "true";
      const cleanupMode = req.query.cleanup === "true";
      const limit = req.query.limit
        ? parseInt(req.query.limit)
        : testMode
        ? 5
        : null;

      console.log(
        `Running in ${testMode ? "TEST" : "PRODUCTION"} mode${
          cleanupMode ? " (CLEANUP)" : ""
        }${limit ? ` with limit of ${limit} documents` : ""}`
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
      const capabilityFields = ["lab", "xray", "ultrasound", "ct", "mri"];
      // Legacy fields to remove
      const fieldsToRemove = [
        "telehealth",
        "beds",
        "icu",
        "lab",
        "xray",
        "ultrasound",
        "ct",
        "mri",
      ];

      for (const doc of locationsSnapshot.docs) {
        const locationData = doc.data();
        const locationRef = db.collection("locations").doc(doc.id);

        // If in cleanup mode - clean up legacy fields and waitTimes entries
        if (cleanupMode) {
          // Prepare object with fields to remove
          const removeData = {};
          fieldsToRemove.forEach((field) => {
            if (field in locationData) {
              // Use special FieldValue.delete() to remove the field
              removeData[field] = firebase.firestore.FieldValue.delete();
            }
          });

          // In test mode, just collect info without making changes
          if (testMode) {
            migrationResults.push({
              id: doc.id,
              title: locationData.title || "Unnamed Location",
              action: "cleanup",
              fieldsToRemove: Object.keys(removeData),
              capabilities: locationData.capabilities || {},
            });
            continue;
          }

          // Only update if there are fields to remove
          if (Object.keys(removeData).length > 0) {
            batch.update(locationRef, removeData);
            operationsCount++;
          }

          // Clean up waitTimes array if it exists
          if (locationData.waitTimes && Array.isArray(locationData.waitTimes)) {
            // Create new waitTimes array without capability fields and legacy fields
            const cleanedWaitTimes = locationData.waitTimes.map((entry) => {
              // Extract customPhone if it's not already at the top level
              if (entry.customPhone && locationData.customPhone === undefined) {
                // Use a separate batch to update the customPhone field
                batch.update(locationRef, { customPhone: entry.customPhone });
                operationsCount++;
              }

              // Remove capability and legacy fields from waitTimes entries
              const {
                lab,
                xray,
                ultrasound,
                ct,
                mri,
                telehealth,
                beds,
                icu,
                ...rest
              } = entry;
              return rest;
            });

            // Update waitTimes if needed
            batch.update(locationRef, { waitTimes: cleanedWaitTimes });
            operationsCount++;
          }
        }
        // Main migration - extract capabilities and customPhone
        else {
          const updateData = {};
          let needsUpdate = false;

          // 1. Extract capabilities
          if (!locationData.capabilities) {
            // Find all dashboard entries with capabilities
            const dashboardEntries =
              locationData.waitTimes?.filter(
                (entry) =>
                  entry.dashboard === true &&
                  (entry.lab !== undefined ||
                    entry.xray !== undefined ||
                    entry.ultrasound !== undefined ||
                    entry.mri !== undefined ||
                    entry.ct !== undefined)
              ) || [];

            if (dashboardEntries.length > 0) {
              // Sort by date to get the most recent entry
              dashboardEntries.sort((a, b) => (b.date || 0) - (a.date || 0));
              const latestEntry = dashboardEntries[0];

              // Create capabilities object from the most recent entry
              updateData.capabilities = {
                lab: latestEntry.lab === true,
                xray: latestEntry.xray === true,
                ultrasound: latestEntry.ultrasound === true,
                ct: latestEntry.ct === true,
                mri: latestEntry.mri === true,
              };

              needsUpdate = true;
            }
            // If no entries found but direct properties exist
            else if (
              capabilityFields.some(
                (field) => locationData[field] !== undefined
              )
            ) {
              updateData.capabilities = {
                lab: locationData.lab === true,
                xray: locationData.xray === true,
                ultrasound: locationData.ultrasound === true,
                ct: locationData.ct === true,
                mri: locationData.mri === true,
              };

              needsUpdate = true;
            }
          }

          // 2. Extract customPhone if needed
          if (locationData.customPhone === undefined) {
            if (locationData.waitTimes) {
              const phoneEntry = [...locationData.waitTimes]
                .sort((a, b) => (b.date || 0) - (a.date || 0))
                .find((entry) => entry.customPhone !== undefined);

              if (phoneEntry) {
                updateData.customPhone = phoneEntry.customPhone;
                needsUpdate = true;
              }
            }
          }

          // 3. Calculate My HealthDesk score if we made changes
          if (needsUpdate) {
            const updatedData = {
              ...locationData,
              ...updateData,
            };
            updateData.hlthdsk_score = calculateHlthdskScore(updatedData);
          }

          // In test mode, just collect the results without making changes
          if (testMode) {
            const enabledCount = updateData.capabilities
              ? Object.values(updateData.capabilities).filter(Boolean).length
              : 0;

            migrationResults.push({
              id: doc.id,
              title: locationData.title || "Unnamed Location",
              action: "migrate",
              current: locationData.hlthdsk_score,
              calculated: updateData.hlthdsk_score,
              capabilities: updateData.capabilities,
              customPhone: updateData.customPhone,
              hasUpdate: needsUpdate,
              enabledCapabilitiesCount: enabledCount,
              totalCapabilities: capabilityFields.length,
              scorePerCapability: Math.round(33 / capabilityFields.length),
            });
            continue;
          }

          // Only add to batch if we have changes to make
          if (needsUpdate) {
            batch.update(locationRef, updateData);
            operationsCount++;
          }
        }

        // Commit batch if it reaches maximum size
        if (operationsCount === MAX_BATCH_SIZE) {
          batches.push(batch);
          batch = db.batch();
          operationsCount = 0;
        }
      }

      // In test mode, return the results without making changes
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
        message: `Successfully processed ${locationsSnapshot.size} locations`,
        mode: cleanupMode ? "cleanup" : "migration",
      });
    } catch (error) {
      console.error("Capabilities migration failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
};
