let walletBalance = localStorage.getItem('poker_wallet') ? parseInt(localStorage.getItem('poker_wallet')) : 1000;
let dailyRewardLevel = 500;
let currentRoom = 'lobby';
let APP_DATA = null;

async function initGame() {
    const response = await fetch('js/data.json');
    APP_DATA = await response.json();
    updateWalletUI();
}

function updateWalletUI() {
    const displays = ['#wallet-hologram', '#side-wallet', '#mirror-wallet'];
    displays.forEach(id => {
        const el = document.querySelector(id);
        if (el) el.setAttribute('value', `WALLET: $${walletBalance.toLocaleString()}`);
    });
    localStorage.setItem('poker_wallet', walletBalance);
}

function claimDailyReward() {
    walletBalance += dailyRewardLevel;
    showNotification(`CLAIMED $${dailyRewardLevel}!\nNext: $${Math.min(dailyRewardLevel + 500, 5000)}`);
    if (dailyRewardLevel < 5000) dailyRewardLevel += 500;
    updateWalletUI();
}

function buyCrown() {
    if (walletBalance >= 10000) {
        walletBalance -= 10000;
        updateWalletUI();
        document.querySelector('#player-crown').setAttribute('visible', 'true');
        document.querySelector('#mirror-crown').setAttribute('visible', 'true');
        document.querySelector('#crown-shop-item').setAttribute('visible', 'false');
        showNotification("CROWN EQUIPPED");
    } else { showNotification("INSUFFICIENT FUNDS"); }
}

function teleport(zone) {
    const rig = document.querySelector('#rig');
    const spawn = APP_DATA.rooms[zone].spawn;
    rig.setAttribute('position', `${spawn.x} ${spawn.y} ${spawn.z}`);
    currentRoom = zone;
    document.querySelector('#player-menu').setAttribute('visible', 'false');
    
    if (zone === 'scorpion') {
        const winUI = document.querySelector('#win-display');
        winUI.setAttribute('visible', 'true');
        setTimeout(() => winUI.setAttribute('visible', 'false'), 10000);
    }
}

function toggleMenu() {
    const menu = document.querySelector('#player-menu');
    const isVisible = !menu.getAttribute('visible');
    menu.setAttribute('visible', isVisible);
}

function showNotification(text) {
    const note = document.querySelector('#vr-notification');
    document.querySelector('#notif-text').setAttribute('value', text);
    note.setAttribute('visible', 'true');
}

function dismissNotification() {
    document.querySelector('#vr-notification').setAttribute('visible', 'false');
}

initGame();
