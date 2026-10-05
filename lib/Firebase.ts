import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAKHSdCCRKs2pBhazhNlT6d_kuEbi9GSMY",
  authDomain: "findback-4925d.firebaseapp.com",
  projectId: "findback-4925d",
  storageBucket: "findback-4925d.firebasestorage.app",
  messagingSenderId: "25060073126",
  appId: "1:25060073126:web:49072894b0cb4a16599e67",
  measurementId: "G-HZTTNJCETS",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export const authReady = setPersistence(
  auth,
  browserLocalPersistence
);

// Analytics
export const analytics =
  typeof window !== "undefined"
    ? isSupported().then((supported) =>
        supported ? getAnalytics(app) : null
      )
    : Promise.resolve(null);