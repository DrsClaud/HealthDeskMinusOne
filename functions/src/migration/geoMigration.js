const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const geohash = require("ngeohash");

exports.createGeoMigrationFunction = () => {
  return async (req, res) => {
    try {
      console.log("Starting geo migration");

      const snapshot = await db.collection("locations").get();
      const docsToUpdate = [];
      let skippedCount = 0;
      let alreadyHaveGeoCount = 0;

      console.log(`Found ${snapshot.size} total documents`);

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Skip if no lat/lng data
        if (!data.lat || !data.lng) {
          console.log(`Skipping ${doc.id}: missing lat/lng`);
          skippedCount++;
          return;
        }

        // Check if document already has the 'g' field with geohash
        if (data.g && data.g.geohash && data.g.geopoint) {
          alreadyHaveGeoCount++;
          return;
        }

        console.log(`Will update ${doc.id}: has lat/lng but missing 'g' field`);

        // Prepare the update data
        const updateData = {
          id: doc.id,
          lat: data.lat,
          lng: data.lng,
          // Keep all existing data
          existingData: data,
        };

        docsToUpdate.push(updateData);
      });

      console.log(`Documents to update: ${docsToUpdate.length}`);
      console.log(`Documents already have geo data: ${alreadyHaveGeoCount}`);
      console.log(`Documents skipped (no lat/lng): ${skippedCount}`);

      if (docsToUpdate.length === 0) {
        return res.json({
          success: true,
          message: "No documents need updating - all already have geo data",
          totalDocs: snapshot.size,
          alreadyHaveGeo: alreadyHaveGeoCount,
          skipped: skippedCount,
        });
      }

      // Process in batches
      const batchSize = 500;
      const batches = [];
      let currentBatch = [];

      for (const docData of docsToUpdate) {
        currentBatch.push(docData);

        if (currentBatch.length === batchSize) {
          batches.push(currentBatch);
          currentBatch = [];
        }
      }

      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      console.log(`Processing ${batches.length} batches`);
      let processedCount = 0;

      for (const batch of batches) {
        const firestoreBatch = db.batch();

        for (const docData of batch) {
          const docRef = db.collection("locations").doc(docData.id);

          // Create GeoPoint
          const geopoint = new admin.firestore.GeoPoint(
            docData.lat,
            docData.lng
          );

          // Generate geohash
          const hash = geohash.encode(docData.lat, docData.lng);

          // Prepare update - only add/update the missing geo fields
          const updateFields = {
            coordinates: geopoint,
            g: {
              geohash: hash,
              geopoint: geopoint,
            },
          };

          // Use update instead of set to preserve existing data
          firestoreBatch.update(docRef, updateFields);
        }

        await firestoreBatch.commit();
        processedCount += batch.length;
        console.log(
          `Updated batch. Progress: ${processedCount}/${docsToUpdate.length}`
        );
      }

      res.json({
        success: true,
        message: "Geo migration completed successfully",
        totalDocs: snapshot.size,
        updatedDocs: docsToUpdate.length,
        alreadyHaveGeo: alreadyHaveGeoCount,
        skipped: skippedCount,
        batchesProcessed: batches.length,
      });
    } catch (error) {
      console.error("Migration failed:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
};
