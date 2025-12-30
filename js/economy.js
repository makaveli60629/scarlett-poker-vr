// economy.js
// Handles player bank, chips, event tickets, store, prestige, achievements

import { db } from './firebase-config.js'; // Firebase Firestore import

// Player data object
let playerData = {
  chips: 50000,
  tickets: 0,
  prestige: 1,
  achievements: [],
  inventory: []
};

// Load player data from Firebase
export async function loadPlayer(uid) {
  const docRef = db.collection('players').doc(uid);
  const doc = await docRef.get();
  if (doc.exists) {
    playerData = doc.data();
    updateHUD();
  } else {
    await docRef.set(playerData);
  }
}

// Save player data to Firebase
export async function savePlayer(uid) {
  await db.collection('players').doc(uid).set(playerData);
}

// Update wrist HUD and table displays
function updateHUD() {
  const chipText = document.getElementById('chip-count');
  if (chipText) chipText.setAttribute('value', `Chips: ${playerData.chips}`);
}

// Add chips to player account
export function addChips(amount) {
  playerData.chips += amount;
  updateHUD();
}

// Deduct chips from player account
export function deductChips(amount) {
  if (playerData.chips >= amount) {
    playerData.chips -= amount;
    updateHUD();
    return true;
  } else {
    alert("Not enough chips!");
    return false;
  }
}

// Grant an event ticket
export function grantTicket() {
  playerData.tickets += 1;
  alert("You received an event ticket!");
}

// Use a ticket to enter a tournament
export function useTicket() {
  if (playerData.tickets > 0) {
    playerData.tickets -= 1;
    alert("Ticket used for tournament entry!");
    return true;
  } else {
    alert("No tickets available!");
    return false;
  }
}

// Prestige system: level up
export function addPrestige() {
  playerData.prestige += 1;
  alert(`Congratulations! You've reached Prestige Level ${playerData.prestige}`);
}

// Achievements system
export function unlockAchievement(name) {
  if (!playerData.achievements.includes(name)) {
    playerData.achievements.push(name);
    alert(`Achievement unlocked: ${name}`);
  }
}

// Inventory management
export function addItemToInventory(item) {
  playerData.inventory.push(item);
  alert(`${item.name} added to inventory`);
}

export function removeItemFromInventory(itemName) {
  playerData.inventory = playerData.inventory.filter(item => item.name !== itemName);
}

// Handle gifting chips (max 2,000 per transaction)
export function giftChips(amount, targetUid) {
  if (amount > 2000) amount = 2000;
  if (deductChips(amount)) {
    db.collection('players').doc(targetUid).update({
      chips: firebase.firestore.FieldValue.increment(amount)
    });
    alert(`Gifted ${amount} chips!`);
  }
}

// Initialize HUD on scene load
document.addEventListener('DOMContentLoaded', () => {
  updateHUD();
});
