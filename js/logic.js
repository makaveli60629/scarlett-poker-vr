/**
 * Scarlett Poker VR - Logic Module v1.3.12
 * Handles: Room State, Smart Menu, VR Notifications, and Wallet Persistence
 */

let currentRoom = 'lobby';
let APP_DATA = null;

// 1. INITIALIZATION: Load the JSON Data
async function initGame() {
    try {
        const response = await fetch('js/data.json');
        APP_DATA = await response.json();
        console.log("Solid Core Data Loaded:", APP_DATA.project);
        updateWalletUI();
        updateClock();
    } catch (error) {
        console.error("Critical Error: data.json not found. Check your js/ folder.", error);
    }
}

// 2. ECONOMY: Wallet and Daily Reward
function updateWalletUI() {
    const el = document.querySelector('#wallet-hologram');
    if (el) el.setAttribute('value', `WALLET: $${walletBalance.toLocaleString()}`);
    localStorage.setItem('poker_wallet', walletBalance);
}

function claimDailyReward() {
    if (!APP_DATA) return;
    const amount = APP_DATA.economy.dailyReward;
    walletBalance += amount;
    updateWalletUI();
    showNotification(`REWARD CLAIMED!\n\n+$${amount.toLocaleString()}\nADDED TO WALLET`);
}

// 3. UI: Clock and VR Notifications
function updateClock() {
    const clockEl = document.querySelector('#menu-clock');
    if (clockEl) {
        const now = new Date();
        clockEl.setAttribute('value', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
}
setInterval(updateClock, 1000);

function showNotification(text) {
    const note = document.querySelector('#vr-notification');
    const noteText = document.querySelector('#notif-text');
    if (note && noteText) {
        noteText.setAttribute('value', text);
        note.setAttribute('visible', 'true');
    }
}

function dismissNotification() {
    document.querySelector('#vr-notification').setAttribute('visible', 'false');
}

// 4. NAVIGATION: Smart Menu and Teleportation
function toggleMenu() {
    const menu = document.querySelector('#player-menu');
    const isVisible = !menu.getAttribute('visible');
    menu.setAttribute('visible', isVisible);

    if (isVisible) {
        const toScorpionBtn = document.querySelector('#btn-to-scorpion');
        const toLobbyBtn = document.querySelector('#btn-to-lobby');

        // Context-aware buttons: Only show what the player needs
        if (currentRoom === 'lobby') {
            toScorpionBtn.setAttribute('visible', 'true');
            toScorpionBtn.setAttribute('scale', '1 1 1');
            toLobbyBtn.setAttribute('visible', 'false');
            toLobbyBtn.setAttribute('scale', '0.001 0.001 0.001');
        } else {
            toScorpionBtn.setAttribute('visible', 'false');
            toScorpionBtn.setAttribute('scale', '0.001 0.001 0.001');
            toLobbyBtn.setAttribute('visible', 'true');
            toLobbyBtn.setAttribute('scale', '1 1 1');
        }
    }
}

function teleport(zone) {
    if (!APP_DATA) return;
    const rig = document.querySelector('#rig');
    const spawn = APP_DATA.rooms[zone].spawn;

    // Execute Teleport
    rig.setAttribute('position', `${spawn.x} ${spawn.y} ${spawn.z}`);
    currentRoom = zone;

    // Feature: Winner Display (Only in Scorpion Room)
    if (zone === 'scorpion') {
        const winUI = document.querySelector('#win-display');
        winUI.setAttribute('visible', 'true');
        // Keep visible for the time set in JSON (10 seconds)
        setTimeout(() => { 
            winUI.setAttribute('visible', 'false'); 
        }, APP_DATA.rooms.scorpion.winDisplayTime);
    }

    // Auto-close menu after teleport
    document.querySelector('#player-menu').setAttribute('visible', 'false');
}

// Start the game logic
initGame();
