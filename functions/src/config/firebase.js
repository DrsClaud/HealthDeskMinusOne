const admin = require("firebase-admin");

// Initialize the app if it hasn't been initialized yet
if (!admin.apps.length) {
  console.log("Initializing Firebase Admin SDK...");

  // Log environment details for debugging
  console.log("Node environment:", process.env.NODE_ENV);
  console.log(
    "Firebase config:",
    process.env.FIREBASE_CONFIG ? "Found" : "Not found"
  );
  console.log(
    "Application credentials:",
    process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? `Found at ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
      : "Not found"
  );

  // Initialize with application default credentials explicitly
  try {
    console.log(
      "Attempting to initialize with application default credentials..."
    );
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log(
      "Firebase Admin initialized successfully with application default credentials"
    );

    // Log the initialized app details
    const appDetails = admin.app().options;
    console.log(
      "Firebase app initialized with project ID:",
      appDetails.projectId
    );
  } catch (error) {
    console.error(
      "Error initializing Firebase Admin with application default credentials:",
      error
    );

    // Fallback to default initialization
    console.log("Falling back to default initialization...");
    admin.initializeApp();
    console.log("Firebase Admin initialized with default settings after error");

    try {
      console.log(
        "Firebase app initialized with project ID:",
        admin.app().options.projectId
      );
    } catch (e) {
      console.error("Could not get project ID from initialized app:", e);
    }
  }
}

// Export the database instance
exports.db = admin.firestore();
exports.admin = admin;
