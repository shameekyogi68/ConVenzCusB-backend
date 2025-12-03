import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return admin;

  try {
    console.log('\n🔥 === FIREBASE ADMIN SDK INITIALIZATION ===');
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";
    console.log('📁 Service Account Path:', serviceAccountPath);
    
    const absolutePath = resolve(serviceAccountPath);
    console.log('📂 Absolute Path:', absolutePath);
    
    const serviceAccount = JSON.parse(readFileSync(absolutePath, "utf8"));
    console.log('✅ Service account file loaded successfully');
    console.log('🔑 Project ID:', serviceAccount.project_id);
    console.log('📧 Client Email:', serviceAccount.client_email);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully");
    console.log('🚀 FCM notifications ready');
    console.log('='.repeat(50));
  } catch (error) {
    console.error("\n❌ === FIREBASE INITIALIZATION FAILED ===");
    console.error("❌ Error:", error.message);
    console.error("📁 Attempted path:", process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json");
    console.error("⚠️  Make sure firebase-service-account.json exists and is valid");
    console.error("💡 For Render: Upload firebase-service-account.json as a Secret File");
    console.error('='.repeat(50));
  }

  return admin;
};

// Initialize on module load
initializeFirebase();

export default admin;
