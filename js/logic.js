let currentRoom = 'lobby';

function updateWalletUI() {
    const el = document.querySelector('#wallet-hologram');
    if(el) el.setAttribute('value', `WALLET: $${walletBalance}`);
    localStorage.setItem('poker_wallet', walletBalance);
}

function updateClock() {
    const clockEl = document.querySelector('#menu-clock');
    if(clockEl) {
        const now = new Date();
        clockEl.setAttribute('value', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
}
setInterval(updateClock, 1000);

function showNotification(text) {
    const note = document.querySelector('#vr-notification');
    const noteText = document.querySelector('#notif-text');
    noteText.setAttribute('value', text);
    note.setAttribute('visible', 'true');
}

function dismissNotification() {
    document.querySelector('#vr-notification').setAttribute('visible', 'false');
}

function claimDailyReward() {
    walletBalance += APP_DATA.economy.dailyReward;
    updateWalletUI();
    showNotification(`REWARD CLAIMED!\n\n+$${APP_DATA.economy.dailyReward}\nADDED TO WALLET`);
}

function toggleMenu() {
    const menu = document.querySelector('#player-menu');
    const isVisible = !menu.getAttribute('visible');
    menu.setAttribute('visible', isVisible);

    if (isVisible) {
        const toScorpionBtn = document.querySelector('#btn-to-scorpion');
        const toLobbyBtn = document.querySelector('#btn-to-lobby');

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
    const rig = document.querySelector('#rig');
    const spawn = APP_DATA.rooms[zone].spawn;
    
    rig.setAttribute('position', `${spawn.x} ${spawn.y} ${spawn.z}`);
    currentRoom = zone;

    if (zone === 'scorpion') {
        const winUI = document.querySelector('#win-display');
        winUI.setAttribute('visible', 'true');
        setTimeout(() => { winUI.setAttribute('visible', 'false'); }, APP_DATA.rooms.scorpion.winDisplayTime);
    }
    document.querySelector('#player-menu').setAttribute('visible', 'false');
}
