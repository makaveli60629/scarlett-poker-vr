// Logic 1.7.2 - Movement & Boundaries
let isPlayerSeated = false;

function controlLoop() {
    const rig = document.querySelector('#rig');
    const pos = rig.object3D.position;

    // BOUNDARY LOCK: Prevent player from leaving the 20x20 area
    const limit = 9.5; // Slightly inside the 10m half-width
    if (pos.x > limit) pos.x = limit;
    if (pos.x < -limit) pos.x = -limit;
    if (pos.z > limit) pos.z = limit;
    if (pos.z < -limit) pos.z = -limit;

    // AUTO-SIT LOGIC: Detect table proximity
    const table = document.querySelector('#poker-table').object3D.position;
    let distance = pos.distanceTo(table);

    if (distance < 2.5 && !isPlayerSeated) {
        isPlayerSeated = true;
        // Animation to move player into the seat
        rig.setAttribute('animation', {
            property: 'position',
            to: '0 0 -2.2',
            dur: 1500,
            easing: 'easeInOutQuad'
        });
        console.log("Player Seated. Ready for Update 1.3 Poker Logic.");
    }
}

// Check every 30ms for 100% responsiveness
setInterval(controlLoop, 30);
