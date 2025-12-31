let APP_DATA = null;

// Load JSON data before the game starts
async function loadGameData() {
    const response = await fetch('js/data.json');
    APP_DATA = await response.json();
    console.log("Data Loaded: ", APP_DATA.project);
}

loadGameData();

// Persistent Wallet Logic
let walletBalance = localStorage.getItem('poker_wallet') ? 
    parseInt(localStorage.getItem('poker_wallet')) : 1000;
