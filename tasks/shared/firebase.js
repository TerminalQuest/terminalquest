require('dotenv').config();

const firebaseAdmin = require('firebase-admin');

// Path to auth credentials for the appropriate Firebase admin credentials
// should be configured as an environment variable for builds
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SA_JSON);
const databaseURL = process.env.FIREBASE_DATABASE_URL;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!serviceAccount || !databaseURL || !storageBucket) {
  throw 'Firebase configuration is required. Check .env.template for more info.';
}

// Initialize Firebase admin SDK
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL,
  storageBucket,
});

// Get handles to relevant Firebase services
const db = firebaseAdmin.firestore();
const bucket = firebaseAdmin.storage().bucket();

module.exports = {
  db,
  bucket,
  firebaseAdmin,
};
