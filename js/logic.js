// js/poker-logic.js
window.walletBalance = 2500;

window.claimDaily = function() {
    let win = Math.floor(Math.random() * 4500) + 500;
    window.walletBalance += win;
    const display = document.querySelector('#wallet-display');
    if(display) display.setAttribute('value', 'WALLET: $' + window.walletBalance);
    console.log("Daily Picked: " + win);
};

window.enterZone = function() {
    const rig = document.querySelector('#rig');
    rig.setAttribute('position', '100 0 5');
};

window.sitAndPlay = function() {
    const rig = document.querySelector('#rig');
    // Automically sit down
    rig.setAttribute('position', '100 0 -2.5');
    // Simulate a win
    setTimeout(() => {
        window.showWinner("PLAYER 1", 1500);
    }, 2000);
};

window.showWinner = function(name, pot) {
    const ui = document.querySelector('#win-ui');
    const banner = document.querySelector('#win-banner');
    
    banner.setAttribute('value', name + " WINS THE POT\n$" + pot);
    ui.setAttribute('visible', 'true');
    
    // Highlight table or cards here
    
    setTimeout(() => {
        ui.setAttribute('visible', 'false');
    }, 10000); // 10 Second rule
};
