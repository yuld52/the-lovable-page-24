import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration - prefer environment variables, fallback to hardcoded values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD_DUO1UFAhh6bNOBWZScrVnXj3Z4GowPU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "meteorfy1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "meteorfy1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "meteorfy1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "94841260635",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:94841260635:web:6b0742b301256f644c0d7e",
  measurementId: "G-NQQG8M32VH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;