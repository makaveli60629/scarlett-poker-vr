// Poker Logic 1.7.2
let isSeated = false;

function gameLoop() {
    const rig = document.querySelector('#rig');
    const pos = rig.object3D.position;

    // 1. BOUNDARY REINFORCEMENT: Lock to the 20x20 floor
    const limit = 9.4; 
    if (pos.x > limit) pos.x = limit;
    if (pos.x < -limit) pos.x = -limit;
    if (pos.z > limit) pos.z = limit;
    if (pos.z < -limit) pos.z = -limit;

    // 2. AUTO-SIT LOGIC
    const table = document.querySelector('#poker-table').object3D.position;
    let distance = pos.distanceTo(table);

    if (distance < 2.5 && !isSeated) {
        isSeated = true;
        rig.setAttribute('animation', {
            property: 'position',
            to: '0 0 -2.3', // Slides you right to the table
            dur: 1500,
            easing: 'easeInOutQuad'
        });
        console.log("Welcome to the Poker Room.");
    }
}

// 1.3 Winning Player Display (10 second indicator)
function displayWin(winnerName) {
    const ui = document.querySelector('#win-ui');
    const text = document.querySelector('#win-text');
    text.setAttribute('value', winnerName + " WINS!");
    ui.setAttribute('visible', 'true');
    
    setTimeout(() => {
        ui.setAttribute('visible', 'false');
    }, 10000);
}

// Run loop at 40fps for smooth movement
setInterval(gameLoop, 25);
