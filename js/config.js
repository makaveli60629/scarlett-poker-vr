// js/config.js
// VERSION 1.3 - FULL CONFIGURATION
// Note: Keeping all history for Store, Lobby, and Oculus Logic.
// --- TELEPORT & ZONE CONFIG (Update 1.5.2) ---

ZONES: {
  LOBBY: {
    min: { x: -10, z: -10 },
    max: { x: 10, z: 10 }
  },

  SCOPRION_ROOM: {
    min: { x: 20, z: -10 },
    max: { x: 40, z: 10 }
  },

  TABLE: {
    center: { x: 25, z: 0 },
    radius: 1.6
  }
},

TELEPORT: {
  MAX_DISTANCE: 6
},

PLAYER: {
  HEIGHT: 1.6
},

TABLE: {
  SEAT_POSITION: { x: 25, y: 1.6, z: 1.2 },
  SEAT_ROTATION: { x: 0, y: 180, z: 0 }
}
const CONFIG = {
    // Oculus VR Controls
    controls: {
        leftHand: {
            thumbstick: "Movement",
            trigger: "Interact",
            grip: "Grab",
            xButton: "Store/Menu",
            yButton: "HUD Toggle"
        },
        rightHand: {
            thumbstick: "Snap Turn",
            trigger: "Confirm/Bet",
            grip: "Discard",
            aButton: "Check/Call",
            bButton: "Fold"
        }
    },

    // Poker Game Logic (Update 1.3)
    gameLogic: {
        winDisplayMs: 10000,       // 10 seconds display for winner
        highlightWinner: true,     // Highlight the player mesh
        autoSit: true,             // Move to "play game" triggers auto-sit
        showCommunityCards: true   // Display winning hand with community cards
    },

    // Environment & Locations
    world: {
        lobby: "Main Lobby",
        store: "Asset Store",
        pokerZone: "Game Table"
    },

    // Placeholder for Update 1.4 Textures
    assets: {
        texturePath: "./textures/",
        manifest: [] // We will fill this with your JPG list next
    }
};

// Exporting so index.js and others can use this data
export default CONFIG;
