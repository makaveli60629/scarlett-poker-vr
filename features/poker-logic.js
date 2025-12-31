import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

let hasSatDown = false;

export function initPokerGame(scene) {
    console.log("Poker Logic Initialized: Ready for players.");
}

// 1. AUTO-SIT & CARD DEALING LOGIC
export function checkTableProximity(userRig, tablePosition, camera) {
    const distance = userRig.position.distanceTo(tablePosition);

    // If user gets close to the "Play Game" area and hasn't sat yet
    if (distance < 2.0 && !hasSatDown) {
        sitPlayerAtTable(userRig, tablePosition);
        dealInitialCards(camera);
        hasSatDown = true;
    } 
    // Reset if they walk away
    else if (distance > 3.0 && hasSatDown) {
        hasSatDown = false;
        console.log("Player stood up.");
    }
}

function sitPlayerAtTable(userRig, tablePosition) {
    // Smoothly snap user to the chair height and position
    userRig.position.set(tablePosition.x, 1.1, tablePosition.z + 1.2);
    console.log("Automatically seated at Poker Table.");
}

function dealInitialCards(camera) {
    // Create "Real Looking" Low-Poly Cards that follow your view
    const cardGroup = new THREE.Group();
    
    for (let i = 0; i < 2; i++) {
        const cardGeo = new THREE.BoxGeometry(0.06, 0.001, 0.09);
        const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const card = new THREE.Mesh(cardGeo, cardMat);
        
        // Fan the cards slightly
        card.position.set(i * 0.07 - 0.03, -0.2, -0.4);
        card.rotation.x = Math.PI / 4;
        cardGroup.add(card);
    }

    // Attach cards to camera so they "stay in your hand"
    camera.add(cardGroup);
}

// 2. DAILY GIVEAWAY LOGIC
export function processDailyGiveaway() {
    const lastClaim = localStorage.getItem('last_blue_claim');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!lastClaim || now - lastClaim > twentyFourHours) {
        localStorage.setItem('last_blue_claim', now);
        return 500; // Reward amount
    }
    return 0;
}
