import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return admin;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";
    const absolutePath = resolve(serviceAccountPath);
    
    const serviceAccount = JSON.parse(readFileSync(absolutePath, "utf8"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Firebase Admin SDK initialization error:", error.message);
    console.log("⚠️  Make sure firebase-service-account.json exists in backend root");
  }

  return admin;
};

// Initialize on module load
initializeFirebase();

export default admin;
