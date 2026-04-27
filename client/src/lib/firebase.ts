import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration - prefer environment variables, fallback to hardcoded values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCyn6AeXgLQ6rhWc141X2p2ItH3xAB8JHg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "meteorfy-11bff.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "meteorfy-11bff",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "meteorfy-11bff.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "782512470436",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:782512470436:web:bce327c3134a730fe0e931"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
