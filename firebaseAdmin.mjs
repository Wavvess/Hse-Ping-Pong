// firebaseAdmin.mjs
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

console.log('FIREBASE_SERVICE_ACCOUNT_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hsepingpong-default-rtdb.firebaseio.com",
  });
}

export default admin;
