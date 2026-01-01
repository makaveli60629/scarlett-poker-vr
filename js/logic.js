// Game State Memory
let stats = {
    money: 1000,
    name: "Player 1",
    rank: "Rookie",
    isSeated: false
};

// Update Watch every second
setInterval(() => {
    const timeDisplay = document.querySelector('#watch-time');
    if(timeDisplay) {
        const now = new Date();
        timeDisplay.setAttribute('value', now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0'));
    }
}, 1000);

// Auto-Sit Logic
function triggerSitDown() {
    const rig = document.querySelector('#rig');
    // Move player to the seat position instantly
    rig.setAttribute('position', '0 0 1'); 
    stats.isSeated = true;
    console.log("Seated. Dealing...");
    dealCards();
}

function dealCards() {
    // 10 second win logic for testing the pop-up
    setTimeout(() => {
        showWinNotification("YOU WON!", "PAIR OF ACES");
    }, 2000);
}

function showWinNotification(name, hand) {
    const display = document.querySelector('#winDisplay');
    const text = document.querySelector('#winText');
    
    text.setAttribute('value', `${name}\n${hand}`);
    display.setAttribute('visible', 'true');

    // Highlighting winning player (Camera Shake/Flash)
    document.querySelector('#camera').setAttribute('animation', 'property: position; to: 0 1.65 0; dur: 100; dir: alternate; loop: 4');

    setTimeout(() => {
        display.setAttribute('visible', 'false');
    }, 10000); // 10 seconds exactly
}

function openMenu() {
    alert("Menu Opened - Money: $" + stats.money + " Rank: " + stats.rank);
}
