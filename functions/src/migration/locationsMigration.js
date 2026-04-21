const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const geohash = require("ngeohash");

exports.createLocationsMigrationFunction = () => {
  return async (req, res) => {
    try {
      // Check for dry run parameter in URL query
      const dryRun = req.query.dryRun === "true";

      console.log(`Starting locations migration${dryRun ? " (DRY RUN)" : ""}`);

      // Read CSV file from migration folder (like ratingMigration.js pattern)
      const csvFilePath = path.join(__dirname, "locations.csv");

      if (!fs.existsSync(csvFilePath)) {
        return res.status(400).json({
          success: false,
          error:
            "locations.csv file not found in migration folder. Please upload your CSV file to functions/src/migration/locations.csv",
        });
      }

      console.log(`Reading CSV file: ${csvFilePath}`);
      const results = [];

      // Parse CSV data from file
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      console.log(`Parsed ${results.length} rows from CSV`);

      // Fields that should be numbers
      const numericFields = [
        "score",
        "score_op22",
        "score_op18b",
        "score_op18c",
        "score_op23",
        "score_overall",
        "lat",
        "lng",
      ];

      // Process data
      const processedData = [];
      let skippedCount = 0;

      for (const row of results) {
        // Check if row has an id field
        if (!row.id) {
          console.warn("Row missing id field, skipping:", row);
          skippedCount++;
          continue;
        }

        // Process each field in the row
        const processedRow = {};

        // Filter out empty fields and keys
        for (const field in row) {
          if (field === "" || field === null || field === undefined) {
            continue;
          }

          if (
            row[field] === "" ||
            row[field] === null ||
            row[field] === undefined
          ) {
            continue;
          }

          processedRow[field] = row[field];
        }

        // Ensure ID is always a string
        processedRow.id = String(processedRow.id || row.id);

        // Process all fields
        for (const field in processedRow) {
          // Convert "Not Available" to null
          if (processedRow[field] === "Not Available") {
            processedRow[field] = null;
          }

          // Convert numeric fields to actual numbers
          if (numericFields.includes(field) && processedRow[field] !== null) {
            if (
              typeof processedRow[field] === "string" &&
              !isNaN(processedRow[field]) &&
              !processedRow[field].match(/[A-Za-z]/)
            ) {
              const numValue = Number(processedRow[field]);
              if (!isNaN(numValue)) {
                processedRow[field] = numValue;
              }
            }
          }
        }

        // Add required fields for HealthDesk compatibility
        if (!processedRow.users) {
          processedRow.users = [];
        }

        // Ensure type field exists for emergency departments
        if (!processedRow.type && processedRow.title) {
          processedRow.type = "Emergency Department";
        }

        // Add coordinates and geohash if lat/lng exist
        if (processedRow.lat && processedRow.lng) {
          const geopoint = new admin.firestore.GeoPoint(
            processedRow.lat,
            processedRow.lng
          );

          processedRow.coordinates = geopoint;

          const hash = geohash.encode(processedRow.lat, processedRow.lng);
          processedRow.g = {
            geohash: hash,
            geopoint: geopoint,
          };
        }

        processedData.push(processedRow);
      }

      console.log(
        `Processed ${processedData.length} valid rows, skipped ${skippedCount}`
      );

      if (dryRun) {
        return res.json({
          success: true,
          message: "Dry run completed",
          totalRows: results.length,
          validRows: processedData.length,
          skippedRows: skippedCount,
          sampleData: processedData.slice(0, 3), // Return first 3 for inspection
        });
      }

      // Check which documents already exist to skip them
      console.log(`Checking for existing documents...`);
      const existingDocs = new Set();
      const docIds = processedData.map((doc) => doc.id);

      // Check in batches of 30 (Firestore limitation for 'in' queries)
      for (let i = 0; i < docIds.length; i += 30) {
        const batchIds = docIds.slice(i, i + 30);
        const snapshot = await db
          .collection("locations")
          .where(admin.firestore.FieldPath.documentId(), "in", batchIds)
          .get();

        snapshot.forEach((doc) => {
          existingDocs.add(doc.id);
        });
      }

      // Filter out existing documents
      const newDocuments = processedData.filter(
        (doc) => !existingDocs.has(doc.id)
      );
      const skippedExisting = processedData.length - newDocuments.length;

      console.log(
        `Found ${existingDocs.size} existing documents - will skip them`
      );
      console.log(`Will create ${newDocuments.length} new documents`);

      if (newDocuments.length === 0) {
        return res.json({
          success: true,
          message: "No new documents to create - all already exist",
          totalRows: results.length,
          processedRows: processedData.length,
          skippedRows: skippedCount,
          existingDocuments: existingDocs.size,
          newDocuments: 0,
        });
      }

      // Write to Firestore in batches
      const batchSize = 500;
      const batches = [];
      let currentBatch = [];

      for (const doc of newDocuments) {
        currentBatch.push(doc);

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

        for (const doc of batch) {
          const docRef = db.collection("locations").doc(doc.id);
          // Keep the id field in the document data as string
          const docData = { ...doc, id: String(doc.id) };
          firestoreBatch.set(docRef, docData); // No merge - only creating new docs
        }

        await firestoreBatch.commit();
        processedCount += batch.length;
        console.log(
          `Committed batch. Progress: ${processedCount}/${newDocuments.length}`
        );
      }

      res.json({
        success: true,
        message: "Migration completed successfully",
        totalRows: results.length,
        processedRows: processedData.length,
        skippedRows: skippedCount,
        existingDocuments: existingDocs.size,
        newDocuments: newDocuments.length,
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
