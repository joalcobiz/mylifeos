import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const env = (import.meta as any).env;

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "lifeos-e00ed.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "lifeos-e00ed",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "lifeos-e00ed.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "960025470156",
    appId: env.VITE_FIREBASE_APP_ID || "1:960025470156:web:1d585da6306b8bc0d64e69",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-TH2P20SV63"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
