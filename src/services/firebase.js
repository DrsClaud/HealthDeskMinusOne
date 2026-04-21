import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import "firebase/compat/storage";
import "firebase/compat/functions";

// Consolidate config into a single object for clarity
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Use initializeTestApp for test environment, regular initializeApp for production
const firebaseApp =
  process.env.NODE_ENV === "test"
    ? firebase.initializeTestApp({
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        auth: { uid: "test-user", email: "test@example.com" },
      })
    : firebase.initializeApp(firebaseConfig);

// Only initialize analytics in production
if (process.env.NODE_ENV === "production") {
  firebase.analytics();
}

const db = firebaseApp.firestore();
const storage = firebaseApp.storage();

export default firebaseApp;
export { db, storage };
