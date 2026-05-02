import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Firebase Admin configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "meteorfy1",
  storageBucket: "meteorfy1.firebasestorage.app",
};

function parsePrivateKey(raw: string): string {
  // Handle literal \n sequences (common when stored in env vars/secrets)
  let key = raw.replace(/\\n/g, '\n');
  // If the key header and body are all on one line, reformat it
  if (!key.includes('\n')) {
    key = key
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }
  return key.trim();
}

// Get credentials from environment - needed for Firestore operations
let credential: any = undefined;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (privateKeyRaw && clientEmail) {
  try {
    const privateKey = parsePrivateKey(privateKeyRaw);
    credential = cert({
      projectId: firebaseConfig.projectId,
      clientEmail: clientEmail,
      privateKey,
    });
    console.log("Firebase Admin: credentials loaded successfully");
  } catch (err) {
    console.warn("Firebase Admin: Failed to parse private key, running without admin credentials:", err instanceof Error ? err.message : err);
    credential = undefined;
  }
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