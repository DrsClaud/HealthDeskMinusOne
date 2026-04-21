const firebaseFunctionsTest = require("firebase-functions-test");

// Initialize the firebase-functions-test SDK
const projectConfig = {
  projectId: "demo-project-id",
  databaseURL: "https://demo-project-id.firebaseio.com",
};

const test = firebaseFunctionsTest(projectConfig);

// Export the initialized test SDK
module.exports = { test };
