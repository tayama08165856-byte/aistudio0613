import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, linkWithPopup, type User } from "firebase/auth";

// Firebase Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyC-nFF-60gS5Dv95kJyxHBYYiXBsWhSNHA",
  authDomain: "glass-brand-xpp0d.firebaseapp.com",
  projectId: "glass-brand-xpp0d",
  storageBucket: "glass-brand-xpp0d.firebasestorage.app",
  messagingSenderId: "400365375401",
  appId: "1:400365375401:web:affe86e1efb24fdf827eb8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if specified
const db = initializeFirestore(app, {}, "ai-studio-b8c640b5-f7d0-4a35-a640-4cab02c90095");

// Initialize Auth
const auth = getAuth(app);

// Google Auth Provider setup for Google Drive scopes
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.metadata.readonly");

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    let result;
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        result = await linkWithPopup(auth.currentUser, provider);
      } catch (linkError: any) {
        console.warn("Linking failed, falling back to direct sign-in:", linkError);
        result = await signInWithPopup(auth, provider);
      }
    } else {
      result = await signInWithPopup(auth, provider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Google Sign-In error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

let memoryFallbackId = null;

// Helper function to sign study/tracker sessions in anonymously to guarantee persistent uid
export const initAuth = () => {
  return new Promise<string>((resolve) => {
    // Check if we already have a generated local fallback ID stored in localStorage safely
    const getLocalFallbackId = () => {
      let fallbackId: string | null = null;
      try {
        fallbackId = localStorage.getItem("edu_user_fallback_id");
      } catch (e) {
        console.warn("localStorage is not accessible, using memory fallback instead:", e);
      }

      if (!fallbackId) {
        fallbackId = memoryFallbackId;
      }

      if (!fallbackId) {
        fallbackId = "local-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        try {
          localStorage.setItem("edu_user_fallback_id", fallbackId);
        } catch (e) {
          // Ignore security blocker errors in sandboxed iframe environment
        }
        memoryFallbackId = fallbackId;
      }
      return fallbackId;
    };

    // Listen for Auth changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        unsubscribe();
        resolve(user.uid);
      } else {
        try {
          const credentials = await signInAnonymously(auth);
          unsubscribe();
          if (credentials.user) {
            resolve(credentials.user.uid);
          } else {
            console.warn("Auth credentials returned empty. Falling back to local ID.");
            resolve(getLocalFallbackId());
          }
        } catch (error) {
          unsubscribe();
          console.warn("Firebase sign-in failed (possibly anonymous auth is disabled). Falling back to local persistent ID:", error);
          resolve(getLocalFallbackId());
        }
      }
    });
  });
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export { db, auth };
