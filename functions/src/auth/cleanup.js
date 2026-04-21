const functions = require("firebase-functions");
const { db } = require("../config/firebase");

async function deleteUserListingsFromZips(uid) {
  try {
    functions.logger.info(
      `Starting deleteUserListingsFromZips for user ${uid}`
    );

    const listingsSnapshot = await db
      .collectionGroup("listings")
      .where("uid", "==", uid)
      .get();

    if (!listingsSnapshot || !listingsSnapshot.docs) {
      functions.logger.info(`No listings found for user ${uid}`);
      return;
    }

    functions.logger.info(
      `Found ${listingsSnapshot.docs.length} listings for user ${uid}`
    );

    for (const listingDoc of listingsSnapshot.docs) {
      try {
        functions.logger.info(
          `Processing listing ${listingDoc.id} at path ${listingDoc.ref.path}`
        );

        // Check if the listing document has subcollections
        const collections = await listingDoc.ref.listCollections();

        if (collections.length > 0) {
          functions.logger.info(
            `Found ${collections.length} subcollections in listing ${listingDoc.id}`
          );

          for (const collection of collections) {
            try {
              functions.logger.info(
                `Processing subcollection ${collection.id} from listing ${listingDoc.id}`
              );
              const subcollectionDocs = await listingDoc.ref
                .collection(collection.id)
                .get();

              functions.logger.info(
                `Found ${subcollectionDocs.docs.length} documents in subcollection ${collection.id}`
              );

              let subBatch = db.batch();
              let subOperationCount = 0;

              for (const subDoc of subcollectionDocs.docs) {
                subBatch.delete(subDoc.ref);
                subOperationCount++;

                if (subOperationCount >= 450) {
                  await subBatch.commit();
                  functions.logger.info(
                    `Committed batch of ${subOperationCount} deletes for subcollection ${collection.id}`
                  );
                  subBatch = db.batch();
                  subOperationCount = 0;
                }
              }

              if (subOperationCount > 0) {
                await subBatch.commit();
                functions.logger.info(
                  `Committed final batch of ${subOperationCount} deletes for subcollection ${collection.id}`
                );
              }
            } catch (subCollectionError) {
              functions.logger.error(
                `Error processing subcollection ${collection.id}:`,
                subCollectionError
              );
            }
          }
        }

        // Now delete the listing document
        functions.logger.info(`Deleting listing document ${listingDoc.id}`);
        await listingDoc.ref.delete();
        functions.logger.info(
          `Successfully deleted listing document ${listingDoc.id}`
        );
      } catch (listingError) {
        functions.logger.error(
          `Error processing listing ${listingDoc.id}:`,
          listingError
        );
      }
    }

    functions.logger.info(
      `Completed deleteUserListingsFromZips for user ${uid}`
    );
  } catch (error) {
    functions.logger.error(`Error in deleteUserListingsFromZips:`, error);
    throw error;
  }
}

async function deleteUserSubcollection(userRef, subcollectionName) {
  const snapshot = await userRef.collection(subcollectionName).get();

  functions.logger.info(
    `Starting deletion of ${subcollectionName}, found ${snapshot.size} documents`
  );

  if (snapshot.empty) {
    functions.logger.info(`No documents found in ${subcollectionName}`);
    return;
  }

  let batch = db.batch();
  let operationCount = 0;
  let totalDeleted = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    operationCount++;
    totalDeleted++;

    if (operationCount >= 450) {
      await batch.commit();
      functions.logger.info(
        `Committed batch of ${operationCount} deletes for ${subcollectionName}`
      );
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
    functions.logger.info(
      `Committed final batch of ${operationCount} deletes for ${subcollectionName}`
    );
  }

  functions.logger.info(
    `Completed deletion of ${totalDeleted} documents from ${subcollectionName}`
  );
}

exports.onAuthenticatedUserDelete = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "1GB",
  })
  .auth.user()
  .onDelete(async (user) => {
    try {
      functions.logger.info(`Starting cleanup for user ${user.uid}`);

      const userRef = db.collection("users").doc(user.uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        functions.logger.info(`No user document found for ${user.uid}`);
        return;
      }

      const { location: locationId } = userSnap.data();

      // Delete user's subcollections
      const subcollections = [
        "checkout_sessions",
        "payments",
        "subscriptions",
        "listings", // Consolidated from zip_ads and zip_promotions
      ];

      functions.logger.info(
        `Processing ${subcollections.length} subcollections`
      );

      // Process subcollections sequentially to avoid timeout
      for (const subcollection of subcollections) {
        functions.logger.info(`Processing subcollection: ${subcollection}`);
        await deleteUserSubcollection(userRef, subcollection);
      }

      // Delete user's listings first
      // functions.logger.info(`Deleting user's listings`);
      // await deleteUserListingsFromZips(user.uid);
      // functions.logger.info(`Completed deleting listings for user ${user.uid}`);

      // Check for any remaining subcollections before deleting user document
      const collections = await userRef.listCollections();
      if (collections.length > 0) {
        functions.logger.info(
          `Found ${collections.length} remaining subcollections`
        );
        for (const collection of collections) {
          functions.logger.info(
            `Processing remaining subcollection: ${collection.id}`
          );
          await deleteUserSubcollection(userRef, collection.id);
        }
      }

      // Delete user document last
      await userRef.delete();
      functions.logger.info(`Deleted user document for ${user.uid}`);

      // Handle location if it exists and is a Clinic
      if (locationId) {
        const locationRef = db.collection("locations").doc(locationId);
        const locationSnap = await locationRef.get();
        if (locationSnap.exists && locationSnap.data().type === "Clinic") {
          await locationRef.delete();
          functions.logger.info(`Deleted clinic location ${locationId}`);
        }
      }
    } catch (error) {
      functions.logger.error(
        "Error during user cleanup:",
        error.message,
        error
      );
      throw new functions.https.HttpsError(
        "internal",
        `Failed to cleanup user data: ${error.message}`
      );
    }
  });
