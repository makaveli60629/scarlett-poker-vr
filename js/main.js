// =========================================================
// SCARLETT POKER VR - MASTER LOGIC (UPDATE 1.5.1)
// =========================================================

// --- 1. ASSET & TEXTURE INITIALIZATION ---
const textureLoader = new THREE.TextureLoader();
const path = 'assets/textures/';

const textures = {
    // Poker Chips
    chip1k: textureLoader.load(path + 'chip_1000.jpg'),
    chip5k: textureLoader.load(path + 'chip_5000.jpg'),
    chip10k: textureLoader.load(path + 'chip_10000.jpg'),
    
    // Environment & Table
    felt: textureLoader.load(path + 'table_felt_green.jpg'),
    stoneWall: textureLoader.load(path + 'wall_stone_runes.jpg'),
    brickWall: textureLoader.load(path + 'brickwall.jpg'),
    ceiling: textureLoader.load(path + 'ceiling_dome_main.jpg'),
    carpet: textureLoader.load(path + 'lobby_carpet.jpg'),
    atlas: textureLoader.load(path + 'table_atlas.jpg'),
    
    // UI, Rewards & Branding
    winnerUI: textureLoader.load(path + 'ui_winner_hologram.jpg'),
    daily: textureLoader.load(path + 'dailyclaim.jpg'),
    crown: textureLoader.load(path + 'Crown.jpg'),
    logo: textureLoader.load(path + 'brand_logo.jpg'),
    casinoArt: textureLoader.load(path + 'casino_art.jpg')
};

// --- 2. OCULUS VR CONTROLLER SETUP ---
const controller1 = renderer.xr.getController(0); // Left
const controller2 = renderer.xr.getController(1); // Right
scene.add(controller1, controller2);

// --- 3. AUTO-SEATING & ZONE LOGIC ---
function checkPlayerMovement(playerPos) {
    const seatZone = new THREE.Vector3(0, 0, -2); // The "Play Game" spot
    if (playerPos.distanceTo(seatZone) < 1.2) {
        playerSitAndDeal();
    }
}

function playerSitAndDeal() {
    console.log("Automatic Seating Triggered. Dealing cards...");
    // Seat height adjustment for VR
    camera.position.y = 1.1; 
}

// --- 4. WINNER DISPLAY (STRICT 10-SECOND RULE) ---
function handleWinnerSequence(playerMesh) {
    // 1. Highlight Winning Player
    playerMesh.material.emissive.setHex(0x00ff00); 

    // 2. Floating Winner Sprite
    const spriteMat = new THREE.SpriteMaterial({ 
        map: textures.winnerUI, 
        transparent: true, 
        blending: THREE.AdditiveBlending 
    });
    const winnerSprite = new THREE.Sprite(spriteMat);
    winnerSprite.position.set(playerMesh.position.x, 2.0, playerMesh.position.z);
    winnerSprite.scale.set(2, 1, 1);
    scene.add(winnerSprite);

    // 3. 10-Second Timer
    setTimeout(() => {
        scene.remove(winnerSprite);
        playerMesh.material.emissive.setHex(0x000000);
    }, 10000);
}

// --- 5. LOBBY STORE & DAILY PICK ($500 - $5000) ---
let currentDailyReward = 500;

function claimDailyPick() {
    if (currentDailyReward <= 5000) {
        console.log(`Reward Claimed: $${currentDailyReward}`);
        showCrownEffect();
        currentDailyReward += 500; // Increment for next visit
    }
}

function showCrownEffect() {
    const crownMat = new THREE.SpriteMaterial({ map: textures.crown, transparent: true });
    const crown = new THREE.Sprite(crownMat);
    crown.position.set(0, 2.5, -4);
    scene.add(crown);
    setTimeout(() => scene.remove(crown), 3000);
}

// --- 6. UPDATE 1.5 CONFIGURATION (The 20 Variables) ---
// Use these to tune the game feel manually
const gameConfig = {
    cardFriction: 0.05,
    cardGravity: -9.8,
    chipStackHeight: 0.02,
    dealSpeed: 1.5,
    lightingIntensity: 1.2,
    bloomStrength: 0.5,
    tableReflection: 0.1,
    // ... add your remaining 13 config points here
};

// --- 7. RENDER LOOP INTERACTION ---
function update() {
    // Raycaster for Oculus interaction with Daily Claim
    // (Logic for trigger presses goes here)
}
