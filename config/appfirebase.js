// config/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./foodaura-b417c-firebase-adminsdk-fbsvc-b060774632.json');

// Initialize Firebase Admin SDK

if (!admin.apps.length) {
  if(!serviceAccount || !serviceAccount.project_id) {
    console.warn('Firebase service account key is missing or invalid. Firebase features will be disabled.');
    module.exports = null; // Export null to indicate Firebase is not initialized
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
console.log('Firebase initialized successfully', serviceAccount ? serviceAccount.project_id : 'No project ID');
module.exports = admin;
