const GAME_CONFIG = {
    version: "1.3.4",
    settings: {
        winDisplayTime: 10000,
        currencySymbol: "$"
    },
    player: {
        seatScorpion: { x: -20, y: 0, z: -19 },
        seatLobby: { x: 0, y: 0, z: 5 }
    },
    rooms: {
        lobby: { id: "lobby", limit: 5000, increment: 500 },
        scorpion: { id: "scorpion_room", buyIn: 1000 },
        store: { id: "store_room", packValue: 5000 }
    }
};

// Initializing the permanent wallet
let walletBalance = localStorage.getItem('poker_wallet') ? parseInt(localStorage.getItem('poker_wallet')) : 1000;
