// Update 1.6.5 - Master Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log("System Online. Final 1.6.5 Stability check...");
});

// 1.3/1.6 Movement Logic
let isPlaying = false;

function checkPosition() {
    const rig = document.querySelector('#rig');
    const camPos = document.querySelector('#player-cam').object3D.position;
    const triggerPos = document.querySelector('#play-zone').object3D.position;
    
    // Check if player is near the blue square
    let distance = new THREE.Vector3(rig.position.x + camPos.x, 0, rig.position.z + camPos.z)
                    .distanceTo(new THREE.Vector3(triggerPos.x, 0, triggerPos.z));

    if (distance < 1.5 && !isPlaying) {
        sitPlayer();
    }
}

function sitPlayer() {
    isPlaying = true;
    const rig = document.querySelector('#rig');
    // Animate move to the table seat
    rig.setAttribute('animation', {
        property: 'position',
        to: '0 0 -5',
        dur: 1000,
        easing: 'easeInOutQuad'
    });
    console.log("Player Seated. Update 1.3 Dealer Logic Active.");
}

// Win Display Logic
function handleWin(winnerName) {
    const ui = document.querySelector('#win-ui');
    const text = document.querySelector('#win-text');
    text.setAttribute('value', winnerName.toUpperCase() + " WINS!");
    ui.setAttribute('visible', 'true');
    
    // 10 Second rule
    setTimeout(() => {
        ui.setAttribute('visible', 'false');
    }, 10000);
}

// Run position check every 300ms
setInterval(checkPosition, 300);
