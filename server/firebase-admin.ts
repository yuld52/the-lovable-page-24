import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "meteorfy1",
  storageBucket: "meteorfy1.firebasestorage.app",
};

function parsePrivateKey(raw: string): string {
  // Strip surrounding quotes
  let key = raw.trim().replace(/^["']|["']$/g, "");
  // The .env file has literal \n sequences that need to become real newlines
  key = key.replace(/\\n/g, "\n");
  // If no newlines exist (e.g. single-line format), add them
  if (!key.includes("\n")) {
    key = key.replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
             .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
  }
  return key;
}

let credential: any = undefined;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail =
  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

if (privateKeyRaw && clientEmail) {
  try {
    const privateKey = parsePrivateKey(privateKeyRaw);
    console.log("[FIREBASE] Key total length:", privateKey.length);
    console.log("[FIREBASE] Raw env length:", privateKeyRaw.length);
    if (privateKey.length < 500) {
      console.error("[FIREBASE] Key is too short - likely truncated. Real RSA 2048-bit keys are ~1700 chars.");
      throw new Error("Private key is too short - truncated in .env file");
    }
    credential = cert({
      projectId: firebaseConfig.projectId,
      clientEmail,
      privateKey,
    });
    console.log("Firebase Admin: credentials loaded successfully");
  } catch (err) {
    console.warn(
      "Firebase Admin: Failed to parse private key, running without admin credentials:",
      err instanceof Error ? err.message : err
    );
    credential = undefined;
  }
}

const apps = getApps();
const app =
  apps.length === 0
    ? initializeApp({
        ...firebaseConfig,
        ...(credential && { credential }),
      })
    : apps[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);

export default app;
