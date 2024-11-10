// firebaseAdmin.mjs
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, 'hsepingpong-firebase-adminsdk-wwn16-7cab323c79.json'); // Update with your service account file name
  const serviceAccount = JSON.parse(
    readFileSync(serviceAccountPath, 'utf8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hsepingpong-default-rtdb.firebaseio.com",
  });
}

export default admin;
