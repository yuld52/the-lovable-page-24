import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Load .env if not already loaded
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, "..", ".env");
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

// Firebase Admin configuration
const firebaseConfig = {
  projectId: "meteorfy-11bff",
  storageBucket: "meteorfy-11bff.firebasestorage.app",
};

// Get credentials from environment - needed for Firestore operations
let credential: any = undefined;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (privateKey && clientEmail && privateKey !== "your-private-key-here") {
  credential = cert({
    projectId: firebaseConfig.projectId,
    clientEmail: clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  });
}

// Initialize Firebase Admin if not already initialized
const apps = getApps();
const app = apps.length === 0 
  ? initializeApp({
      ...firebaseConfig,
      ...(credential && { credential }),
    })
  : apps[0];

// Initialize services
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);

export default app;
