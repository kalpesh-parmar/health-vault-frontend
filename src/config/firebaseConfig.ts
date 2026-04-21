import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC_1tRpxQXQMKhTMoRtpxfGIYDeOTAwN70",
  authDomain: "documentsvaultapp.firebaseapp.com",
  projectId: "documentsvaultapp",
  storageBucket: "documentsvaultapp.firebasestorage.app",
  messagingSenderId: "14636545690",
  appId: "1:14636545690:web:d22f81ed95045149d0d123",
};

// ✅ Prevent multiple app initialization (VERY IMPORTANT in Expo)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ✅ Safe auth instance
const authInstance = getAuth(app);

// ✅ Export SAME instance everywhere
export { authInstance as auth };

// Firestore
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;