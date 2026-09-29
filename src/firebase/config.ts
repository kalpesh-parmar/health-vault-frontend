import app from "@react-native-firebase/app";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

// Environment configuration for reference / web fallback
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
};

/**
 * Cleanly signs out current user from native Firebase Auth session.
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    const authInstance = auth();
    if (authInstance?.currentUser) {
      await authInstance.signOut();
    }
  } catch (error) {
    console.warn("[Firebase] Error during signOutFirebase:", error);
  }
};

export { app, auth, firebaseConfig };
export type { FirebaseAuthTypes };
export default app;
