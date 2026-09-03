import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBJI5Vfuoj0nDGnrodQ-3Ubs1R1s9dlJu4",
  authDomain: "abodpos-1beee.firebaseapp.com",
  projectId: "abodpos-1beee",
  storageBucket: "abodpos-1beee.firebasestorage.app",
  messagingSenderId: "606982390793",
  appId: "1:606982390793:web:2582990955f1108cf064d8"
};

// Initialize Firebase safely for SSR / Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
