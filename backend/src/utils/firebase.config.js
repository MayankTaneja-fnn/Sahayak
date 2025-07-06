import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8")
);

console.log("Service Account:", serviceAccount);
//   );
// } else {
  // Local development (reads from firebase-admin-creds.js)
//   const creds = await import("../../firebase-admin-creds.js");
//   serviceAccount = creds.default;
// }

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.GOOGLE_STORAGE_BUCKET, // make sure this env var exists
  });
}

// Export Firestore and Storage
const db = admin.firestore();
const storage = admin.storage().bucket();

export { admin, db, storage };
