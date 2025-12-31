function updateWalletUI() {
    const el = document.querySelector('#wallet-hologram');
    if(el) el.setAttribute('value', `WALLET: ${GAME_CONFIG.settings.currencySymbol}${walletBalance}`);
    localStorage.setItem('poker_wallet', walletBalance);
}

function sitDown(room) {
    const rig = document.querySelector('#rig');
    const pos = (room === 'scorpion') ? GAME_CONFIG.player.seatScorpion : GAME_CONFIG.player.seatLobby;
    rig.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    
    // Trigger Win Display for 10 seconds if sitting at a table
    if(room === 'scorpion') {
        const winUI = document.querySelector('#win-letters');
        winUI.setAttribute('visible', 'true');
        setTimeout(() => { winUI.setAttribute('visible', 'false'); }, GAME_CONFIG.settings.winDisplayTime);
    }
}

function claimDaily() {
    const win = Math.floor(Math.random() * 10 + 1) * GAME_CONFIG.rooms.lobby.increment;
    walletBalance += win;
    updateWalletUI();
    alert(`You claimed ${win}!`);
}

function toggleMenu() {
    const menu = document.querySelector('#player-menu');
    const isVisible = menu.getAttribute('visible');
    menu.setAttribute('visible', !isVisible);
}
