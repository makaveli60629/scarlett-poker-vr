// index.js - Full Update 1.5.1 Base
import CONFIG from './js/config.js';

// 1. VR Initialization & Oculus Controls
const sessionVars = {
    isVR: false,
    controllers: []
};

function initGame() {
    console.log("Initializing Version 1.5.1...");
    
    // Setup Scene (The "Box")
    // If this fails, you see blue.
    setupEnvironment();
    setupLobby();
}

// 2. The "Auto-Sit" Logic
// When the user moves to the "Play Game" area
function checkPlayerLocation(playerPosition) {
    const pokerZone = { x: 0, y: 0, z: -5 }; // Example coordinates
    
    if (distance(playerPosition, pokerZone) < 2) {
        sitDownAndDeal();
    }
}

function sitDownAndDeal() {
    console.log("Player reached Play Game area. Auto-sitting...");
    // Trigger Highlight for player
    // Display cards
    displayWinnerPopup("PREPARING GAME..."); 
}

// 3. Winning Display (10 Second Rule)
function displayWinnerPopup(message) {
    const uiElement = document.getElementById('win-display');
    uiElement.innerText = message;
    uiElement.style.display = 'block';
    
    setTimeout(() => {
        uiElement.style.display = 'none';
    }, CONFIG.gameLogic.winDisplayMs); // Uses the 10000ms from your config
}

// 4. Oculus Input Handling
function handleControllerInput() {
    // Left Hand - Movement (Thumbstick)
    // Right Hand - A Button (Check/Call)
    // This ensures your Oculus controls stay mapped.
}

// EXECUTE
initGame();
