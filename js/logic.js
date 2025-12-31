function initGame() {
    const savedWallet = localStorage.getItem('poker_wallet');
    if (savedWallet) GAME_CONFIG.player.wallet = parseInt(savedWallet);
    updateWalletUI();
}

function updateWalletUI() {
    const display = document.querySelector('#wallet-display');
    if(display) display.setAttribute('value', `WALLET: $${GAME_CONFIG.player.wallet}`);
}

function autoSitScorpion() {
    const rig = document.querySelector('#rig');
    // Teleport directly to the seat
    rig.setAttribute('position', GAME_CONFIG.player.scorpionSeat);
    
    // Show winning hand logic (10 seconds)
    const winUI = document.querySelector('#win-popup');
    winUI.setAttribute('visible', 'true');
    setTimeout(() => { winUI.setAttribute('visible', 'false'); }, 10000);
}

function claimDaily() {
    const win = (Math.floor(Math.random() * 10) + 1) * 500;
    GAME_CONFIG.player.wallet += win;
    localStorage.setItem('poker_wallet', GAME_CONFIG.player.wallet);
    updateWalletUI();
}
