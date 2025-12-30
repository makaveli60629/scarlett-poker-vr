// ===========================
// Scarlett VR Poker Economy
// ===========================

// Firebase App Config
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const db = getFirestore(app);

// Example: Player Account Creation
async function createPlayer(uid, username) {
  const playerRef = doc(db, "players", uid);
  await setDoc(playerRef, {
    username: username,
    chips: 1000,           // Starting chips
    tickets: 0,            // Cash App tickets
    inventory: []
  });
}

// Get Player Data
async function getPlayerData(uid) {
  const playerRef = doc(db, "players", uid);
  const playerSnap = await getDoc(playerRef);
  if (playerSnap.exists()) {
    return playerSnap.data();
  } else {
    console.warn("Player does not exist.");
    return null;
  }
}

// Update Player Chips
async function updateChips(uid, amount) {
  const playerRef = doc(db, "players", uid);
  await updateDoc(playerRef, {
    chips: increment(amount)
  });
}

// Add Item to Inventory
async function addItem(uid, item) {
  const playerRef = doc(db, "players", uid);
  await updateDoc(playerRef, {
    inventory: item
  });
}

// ===========================
// Tournament & Ticket Logic
// ===========================

// Example: Free Event Ticket
async function awardEventTicket(uid) {
  const playerRef = doc(db, "players", uid);
  await updateDoc(playerRef, {
    tickets: increment(1)
  });
  console.log("Event ticket awarded to:", uid);
}

// Enter Tournament
async function enterTournament(uid, ticketCost) {
  const playerRef = doc(db, "players", uid);
  const playerData = await getPlayerData(uid);
  if (playerData.tickets >= ticketCost) {
    await updateDoc(playerRef, {
      tickets: increment(-ticketCost)
    });
    console.log(`${uid} entered tournament!`);
    return true;
  } else {
    console.warn("Not enough tickets.");
    return false;
  }
}

// Winner Reward
async function awardTournamentWinner(uid, cashPrize) {
  const playerRef = doc(db, "players", uid);
  await updateDoc(playerRef, {
    chips: increment(cashPrize)
  });
  console.log(`${uid} won the tournament!`);
}

// ===========================
// Friend Tip Logic
// ===========================
async function tipFriend(senderUid, receiverUid, amount) {
  const senderRef = doc(db, "players", senderUid);
  const receiverRef = doc(db, "players", receiverUid);

  const senderData = await getPlayerData(senderUid);
  if (senderData.chips >= amount && amount <= 2000) {  // Max tip limit
    await updateDoc(senderRef, { chips: increment(-amount) });
    await updateDoc(receiverRef, { chips: increment(amount) });
    console.log(`${senderUid} tipped ${receiverUid} ${amount} chips`);
    return true;
  } else {
    console.warn("Tip failed. Insufficient chips or over max limit.");
    return false;
  }
}

// ===========================
// HUD Integration
// ===========================
async function refreshHUD(uid) {
  const data = await getPlayerData(uid);
  if (data) {
    const hudChips = document.getElementById("hudChips");
    const hudPot = document.getElementById("hudPot");
    if (hudChips) hudChips.textContent = data.chips;
    if (hudPot) hudPot.textContent = 0;  // Reset pot display
  }
}

// Auto-update HUD every 2 seconds
setInterval(async () => {
  // Replace with actual logged-in UID
  const currentUID = "player1";
  await refreshHUD(currentUID);
}, 2000);

// ===========================
// Export Functions
// ===========================
export {
  createPlayer,
  getPlayerData,
  updateChips,
  addItem,
  awardEventTicket,
  enterTournament,
  awardTournamentWinner,
  tipFriend,
  refreshHUD
};
