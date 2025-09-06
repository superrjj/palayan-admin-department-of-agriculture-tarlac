// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔑 galing ito sa Firebase Console mo
const firebaseConfig = {
  apiKey: "AIzaSyDoH4hu-jKw1-GoVR7rv60sH6Ob1L0LT6w",
  authDomain: "palayan-app.firebaseapp.com",
  projectId: "palayan-app",
  storageBucket: "palayan-app.firebasestorage.app",
  messagingSenderId: "215972469336",
  appId: "1:215972469336:web:9407d185aa3f0c02ae482d",
};

const app = initializeApp(firebaseConfig);

// Firestore instance
export const db = getFirestore(app);

// Firebase Storage instance
export const storage = getStorage(app);
