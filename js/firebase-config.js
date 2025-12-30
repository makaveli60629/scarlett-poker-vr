// Import the Firebase modules we need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// -------------------------
// ScarlettPokerVR Firebase Config
// -------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBtjE9ES-M6XkgUSKkDPesob1251W0buuM",
  authDomain: "scarlettpokervr.firebaseapp.com",
  projectId: "scarlettpokervr",
  storageBucket: "scarlettpokervr.appspot.com",
  messagingSenderId: "511190933567",
  appId: "1:511190933567:web:bb530da9195c62505f588a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

// -------------------------
// Player Authentication
// -------------------------
export function initAuth(callback) {
    // Anonymous login for testing / VR players
    signInAnonymously(auth)
    .then(() => {
        console.log("Signed in anonymously.");
    })
    .catch((error) => {
        console.error("Auth error:", error);
    });

    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("User logged in: ", user.uid);
            callback(user.uid);
        } else {
            console.log("User logged out");
        }
    });
}

// -------------------------
// Player Data Management
// -------------------------
export async function createPlayerProfile(uid) {
    const playerRef = doc(db, "players", uid);
    const docSnap = await getDoc(playerRef);
    if (!docSnap.exists()) {
        await setDoc(playerRef, {
            chips: 50000,
            tickets: 0,
            achievements: [],
            inventory: [],
            lastLogin: new Date()
        });
        console.log("Profile created for", uid);
    } else {
        console.log("Profile already exists for", uid);
    }
}

// Update chips / inventory / tickets
export async function updatePlayerData(uid, data) {
    const playerRef = doc(db, "players", uid);
    await updateDoc(playerRef, data);
    console.log("Updated player data for", uid);
}

// Get player profile
export async function getPlayerProfile(uid) {
    const playerRef = doc(db, "players", uid);
    const docSnap = await getDoc(playerRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        console.warn("No profile found for", uid);
        return null;
    }
}
