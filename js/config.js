// This is your Consolidated Project Brain
const GAME_CONFIG = {
    version: "1.3.3",
    player: {
        startPos: "0 0 5",
        scorpionSeat: "-20 0 -19", // Exact seat for auto-sit
        initialWallet: 1000
    },
    rooms: {
        lobby: { 
            position: "0 0 0", 
            wallTexture: "assets/textures/brickwall.jpg",
            floorTexture: "assets/textures/lobby_carpet.jpg"
        },
        scorpion: { 
            position: "-20 0 -20", 
            tableTexture: "assets/textures/table_atlas.jpg" 
        },
        store: { 
            position: "20 0 0", 
            chipsPack: 5000 
        }
    },
    ui: {
        winDisplayDuration: 10000, // 10 seconds
        menuColor: "#111",
        accentColor: "#00d2ff"
    }
};

// Logic to ensure wallet stays permanent
let currentWallet = localStorage.getItem('poker_wallet') 
    ? parseInt(localStorage.getItem('poker_wallet')) 
    : GAME_CONFIG.player.initialWallet;
