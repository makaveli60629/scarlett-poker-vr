/* SCARLETT VR CORE - v1.4.1 (STRUCTURAL LOCK) */
let walletBalance = localStorage.getItem('poker_wallet') ? parseInt(localStorage.getItem('poker_wallet')) : 1000;
let isLockedInSeat = false;

async function initCore() {
    updateUI();
}

function updateUI() {
    const targets = ['#wallet-hologram', '#menu-wallet'];
    targets.forEach(id => {
        const el = document.querySelector(id);
        if (el) el.setAttribute('value', `$${walletBalance.toLocaleString()}`);
    });
    localStorage.setItem('poker_wallet', walletBalance);
}

// THE LOCK MECHANISM
function sitAtTable() {
    const rig = document.querySelector('#rig');
    // Move player to exact chair position
    rig.setAttribute('position', '-50 0.5 -50'); 
    isLockedInSeat = true;
    
    // Disable blinking/movement so player can't jump out
    rig.removeAttribute('blink-controls');
    showNotif("LOCKED IN SEAT - USE MENU TO STAND");
    triggerHaptic(0.8, 200);
}

function standUp() {
    const rig = document.querySelector('#rig');
    isLockedInSeat = false;
    // Re-enable controls
    rig.setAttribute('blink-controls', 'cameraRig: #rig; teleportableEntities: .clickable');
    showNotif("STANDING UP");
}

function teleport(zone) {
    if (isLockedInSeat) {
        showNotif("MUST STAND UP FIRST");
        return;
    }
    const rig = document.querySelector('#rig');
    const spawnPoints = {
        'lobby': '0 0 5',
        'store': '50 0 50',
        'scorpion': '-50 0 -45'
    };
    rig.setAttribute('position', spawnPoints[zone]);
    if(document.querySelector('#player-menu').getAttribute('visible')) toggleMenu();
}

function toggleMenu() {
    const menu = document.querySelector('#player-menu');
    menu.setAttribute('visible', !menu.getAttribute('visible'));
}

function showNotif(text) {
    const el = document.querySelector('#notif-panel');
    document.querySelector('#notif-text').setAttribute('value', text);
    el.setAttribute('visible', 'true');
    setTimeout(() => el.setAttribute('visible', 'false'), 3000);
}

function triggerHaptic(i, d) {
    const hand = document.querySelector('#right-hand');
    if (hand?.components['oculus-touch-controls']?.gamepad?.hapticActuators) {
        hand.components['oculus-touch-controls'].gamepad.hapticActuators[0].pulse(i, d);
    }
}

initCore();
