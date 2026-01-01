/* SCARLETT POKER VR - UPDATE 1.3.40 (SOLID GOLD)
   Logic: Haptics, Compact Menu, & Multi-Room Navigation
*/

let walletBalance = localStorage.getItem('poker_wallet') ? parseInt(localStorage.getItem('poker_wallet')) : 1000;
let dailyRewardLevel = 500;
let APP_DATA = null;

async function initGame() {
    const response = await fetch('js/data.json');
    APP_DATA = await response.json();
    updateWalletUI();
}

function triggerHaptic(hand, intensity = 0.5, duration = 100) {
    const controller = document.querySelector(hand === 'left' ? '#left-hand' : '#right-hand');
    if (controller && controller.components['oculus-touch-controls']) {
        const gamepad = controller.components['oculus-touch-controls'].gamepad;
        if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
            gamepad.hapticActuators[0].pulse(intensity, duration);
        }
    }
}

function updateWalletUI() {
    const displays = ['#wallet-hologram', '#menu-wallet'];
    displays.forEach(id => {
        const el = document.querySelector(id);
        if (el) el.setAttribute('value', `$${walletBalance.toLocaleString()}`);
    });
    localStorage.setItem('poker_wallet', walletBalance);
}

function teleport(zone) {
    if (APP_DATA.rooms[zone].status === "locked") {
        showNotification("LOCKED: EVENT COMING SOON");
        triggerHaptic('right', 0.8, 300);
        return;
    }
    const rig = document.querySelector('#rig');
    const spawn = APP_DATA.rooms[zone].spawn;
    rig.setAttribute('position', `${spawn.x} ${spawn.y} ${spawn.z}`);
    triggerHaptic('left', 0.4, 150);
    if(document.querySelector('#player-menu').getAttribute('visible')) toggleMenu();
}

function toggleMenu() {
    const menu = document.querySelector('#player-menu');
    const isVisible = menu.getAttribute('visible');
    menu.setAttribute('visible', !isVisible);
    triggerHaptic('left', 0.3, 50);
}

function buyCrown() {
    if (walletBalance >= 10000) {
        walletBalance -= 10000;
        updateWalletUI();
        document.querySelector('#player-crown').setAttribute('visible', 'true');
        showNotification("CROWN EQUIPPED");
        triggerHaptic('right', 1.0, 500);
    } else {
        showNotification("NEED $10,000");
    }
}

function showNotification(msg) {
    const note = document.querySelector('#vr-notification');
    document.querySelector('#notif-text').setAttribute('value', msg);
    note.setAttribute('visible', 'true');
    setTimeout(() => note.setAttribute('visible', 'false'), 3000);
}

initGame();
