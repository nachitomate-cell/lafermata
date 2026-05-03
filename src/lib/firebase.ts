import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyAwKORbpt_KfJ2RP147g7yPnD7Kxq_1zH0",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "lafermata-fa9d5.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "lafermata-fa9d5",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "lafermata-fa9d5.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "360528412505",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:360528412505:web:da4fc14b0e0b98f8bb5648",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || "G-1RNK37HX4B",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db   = getFirestore(app);
