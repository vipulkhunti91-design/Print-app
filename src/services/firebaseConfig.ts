/**
 * Firebase Client Configuration & Environment Integration
 * Supports both live Firebase project environments and development mode.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConfigured: boolean;
  isProduction: boolean;
}

// Retrieve configuration from Vite environment variables (VITE_FIREBASE_*)
export function getFirebaseEnvConfig(): FirebaseEnvConfig {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY || "";
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || "printq-campus.firebaseapp.com";
  const projectId = env.VITE_FIREBASE_PROJECT_ID || "printq-campus";
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || "printq-campus.appspot.com";
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || "";
  const appId = env.VITE_FIREBASE_APP_ID || "";

  const isConfigured = Boolean(apiKey && apiKey.length > 10 && !apiKey.includes("YOUR_"));
  const isProduction = env.PROD || env.MODE === "production";

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    isConfigured,
    isProduction,
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function initFirebaseClient(): { app: FirebaseApp | null; auth: Auth | null } {
  const config = getFirebaseEnvConfig();

  if (!config.isConfigured) {
    // In local development or testing without live API keys, the securityEngine
    // runs the rule-compliant cryptographic backend authorization engine.
    return { app: null, auth: null };
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      });
    } else {
      appInstance = getApps()[0];
    }
    authInstance = getAuth(appInstance);
    return { app: appInstance, auth: authInstance };
  } catch (error) {
    console.warn("[Firebase] Could not initialize live Firebase SDK, using local secure engine:", error);
    return { app: null, auth: null };
  }
}

