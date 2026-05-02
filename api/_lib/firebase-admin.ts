import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const firebaseConfig = {
  projectId: "meteorfy1",
  storageBucket: "meteorfy1.firebasestorage.app",
};

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let app: any = null;
let _adminAuth: any = null;
let _adminDb: any = null;
let _adminStorage: any = null;

function initializeFirebaseAdmin() {
  if (app) return { app, adminAuth: _adminAuth, adminDb: _adminDb, adminStorage: _adminStorage };

  const apps = getApps();

  if (apps.length > 0) {
    app = apps[0];
  } else if (privateKey && clientEmail && privateKey !== "your-private-key-here") {
    const credential = cert({
      projectId: firebaseConfig.projectId,
      clientEmail: clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });

    app = initializeApp({
      ...firebaseConfig,
      credential,
    });
  } else {
    app = initializeApp(firebaseConfig);
  }

  _adminAuth = getAuth(app);
  _adminDb = getFirestore(app);
  _adminStorage = getStorage(app);

  return { app, adminAuth: _adminAuth, adminDb: _adminDb, adminStorage: _adminStorage };
}

const initialized = initializeFirebaseAdmin();

export const adminAuth = initialized.adminAuth;
export const adminDb = initialized.adminDb;
export const adminStorage = initialized.adminStorage;
export default initializeFirebaseAdmin;
