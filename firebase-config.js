// Firebase configuration for ScarlettPokerVR

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtjE9ES-M6XkgUSKkDPesob1251W0buuM",
  authDomain: "scarlettpokervr.firebaseapp.com",
  projectId: "scarlettpokervr",
  storageBucket: "scarlettpokervr.appspot.com",
  messagingSenderId: "511190933567",
  appId: "1:511190933567:web:bb530da9195c62505f588a"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
