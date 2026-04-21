const { db } = require("../config/firebase");

exports.createRatingMigrationFunction = () => {
  return async (req, res) => {
    try {
      // Import ratings data from local JSON file
      const ratingsData = require("./data_ratings.json");

      console.log(`Loaded ${ratingsData.length} ratings from JSON`);

      // Process in batches
      const batches = [];
      let batch = [];
      const batchSize = 500;

      // Group records into batches
      ratingsData.forEach((record) => {
        const { id, rating } = record;

        if (!id || rating === undefined) {
          console.warn("Skipping invalid record:", record);
          return;
        }

        batch.push({
          id: id.toString(), // Convert ID to string since Firestore document IDs must be strings
          data: { rating: Number(rating) },
        });

        if (batch.length === batchSize) {
          batches.push(batch);
          batch = [];
        }
      });

      if (batch.length) batches.push(batch);

      // Process each batch
      for (const batch of batches) {
        await Promise.all(
          batch.map(({ id, data }) =>
            db.collection("locations").doc(id).set(data, { merge: true })
          )
        );
        console.log(`Processed batch of ${batch.length} documents`);
      }

      res.json({
        success: true,
        message: `Successfully updated ${ratingsData.length} locations with ratings`,
      });
    } catch (error) {
      console.error("Rating migration failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
};
