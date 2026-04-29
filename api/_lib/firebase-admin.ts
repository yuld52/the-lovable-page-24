import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import path from "path";
import fs from "fs";

// Load .env if not already loaded
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        if (key.trim() && !process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
} catch (err) {
  console.error("Error loading .env in firebase-admin:", err);
}

const firebaseConfig = {
  projectId: "meteorfy1",
  storageBucket: "meteorfy1.firebasestorage.app",
};

// Get credentials from environment
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let app: any = null;
let adminAuth: any = null;
let adminDb: any = null;
let adminStorage: any = null;

function initializeFirebaseAdmin() {
  if (app) return { app, adminAuth, adminDb, adminStorage };

  const apps = getApps();
  
  if (apps.length > 0) {
    app = apps[0];
  } else if (privateKey && clientEmail && privateKey !== "your-private-key-here") {
    const credential = cert({
      projectId: firebaseConfig.projectId,
      clientEmail: clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });

    app = initializeApp({
      ...firebaseConfig,
      credential,
    });
  } else {
    // Initialize without credential for basic operations
    app = initializeApp(firebaseConfig);
  }

  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
  adminStorage = getStorage(app);

  return { app, adminAuth, adminDb, adminStorage };
}

export { adminAuth, adminDb, adminStorage };
export default initializeFirebaseAdmin;