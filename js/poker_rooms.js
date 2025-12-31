// ROOM CONFIGURATIONS
const ROOM_SETTINGS = {
    LOW:    { color: "#4CAF50", stakes: "1/2",   minBuyIn: 100,  roomID: "low-stakes-room" },
    MEDIUM: { color: "#2196F3", stakes: "5/10",  minBuyIn: 500,  roomID: "med-stakes-room" },
    HIGH:   { color: "#9C27B0", stakes: "50/100", minBuyIn: 5000, roomID: "high-stakes-room" }
};

// INITIALIZE ROOMS
window.addEventListener('load', () => {
    initPokerEnvironment();
});

function initPokerEnvironment() {
    const world = document.querySelector('#poker-world-container');

    // Create the 3 distinct rooms (off-set in space)
    createRoom(ROOM_SETTINGS.LOW, {x: 20, y: 0, z: 0});
    createRoom(ROOM_SETTINGS.MEDIUM, {x: 40, y: 0, z: 0});
    createRoom(ROOM_SETTINGS.HIGH, {x: 60, y: 0, z: 0});
}

function createRoom(settings, position) {
    const room = document.createElement('a-entity');
    room.setAttribute('position', position);
    room.setAttribute('id', settings.roomID);

    // 1. ADD BRICK WALLS (3 Walls per room as requested)
    const wallHTML = `
        <a-box position="0 2.5 -5" width="10" height="5" depth="0.2" src="#brick-wall"></a-box>
        <a-box position="-5 2.5 0" rotation="0 90 0" width="10" height="5" depth="0.2" src="#brick-wall"></a-box>
        <a-box position="5 2.5 0" rotation="0 -90 0" width="10" height="5" depth="0.2" src="#brick-wall"></a-box>
    `;
    room.innerHTML = wallHTML;

    // 2. CREATE BRANDED POKER TABLE
    const table = document.createElement('a-cylinder');
    table.setAttribute('radius', '2');
    table.setAttribute('height', '0.1');
    table.setAttribute('position', '0 1 0');
    table.setAttribute('src', '#poker-branding'); // Your Custom Branding
    table.setAttribute('color', settings.color);
    
    // 3. AUTO-SIT TRIGGERS (The "Play Game" zones)
    const chairPositions = [
        {x: 0, z: 2.2}, {x: 2.2, z: 0}, {x: 0, z: -2.2}, {x: -2.2, z: 0}
    ];

    chairPositions.forEach((pos, index) => {
        const chair = document.createElement('a-box');
        chair.setAttribute('position', `${pos.x} 0.5 ${pos.z}`);
        chair.setAttribute('width', '0.5');
        chair.setAttribute('height', '0.5');
        chair.setAttribute('depth', '0.5');
        chair.setAttribute('color', '#333');
        chair.setAttribute('class', 'play-game-trigger');
        
        // Logic: When user overlaps with chair
        chair.addEventListener('componentchanged', (evt) => {
            if (evt.detail.name === 'position') {
                checkAutoSit(evt.target);
            }
        });

        table.appendChild(chair);
    });

    room.appendChild(table);
    document.querySelector('#poker-world-container').appendChild(room);
}

// LOGIC FOR AUTOMATIC SITTING AND CARD DEALING
function checkAutoSit(chair) {
    const player = document.querySelector('#rig');
    const playerPos = player.getAttribute('position');
    const chairPos = chair.object3D.getWorldPosition(new THREE.Vector3());

    // If player is within 0.5 meters of the "Play Game" spot
    if (playerPos.distanceTo(chairPos) < 0.5) {
        // Sit the player
        player.setAttribute('position', {x: chairPos.x, y: 1.2, z: chairPos.z});
        console.log("Player Sat Down. Dealing Low-Poly Cards...");
        dealCards();
    }
}

function dealCards() {
    // Logic to spawn #low-poly-card from assets at player location
}
