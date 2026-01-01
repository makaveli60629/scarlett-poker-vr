// =========================================================
// SCARLETT POKER VR - MAIN LOGIC (UPDATE 1.5.1)
// =========================================================

// --- 1. GLOBAL ASSETS & TEXTURE LOADING ---
const textureLoader = new THREE.TextureLoader();
const path = 'assets/textures/'; // Based on your GitHub folder structure

const textures = {
    // Chips (From your Asset Folder)
    chip1000: textureLoader.load(path + 'chip_1000.jpg'),
    chip5000: textureLoader.load(path + 'chip_5000.jpg'),
    chip10000: textureLoader.load(path + 'chip_10000.jpg'),
    
    // Environment & Table Surfaces
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
// Integrated to ensure Quest/Oculus compatibility
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1, controller2);

// --- 3. AUTO-SEATING & CARD DEALING LOGIC ---
// Triggered when player moves to the 'Play Game' zone
function checkZoneInteraction(playerVector) {
    const playTriggerZone = new THREE.Vector3(0, 0, -3); 
    
    if (playerVector.distanceTo(playTriggerZone) < 1.5) {
        autoSitPlayer();
    }
}

function autoSitPlayer() {
    console.log("Player seated: Dispensing cards...");
    // Logic for card meshes appearing in front of player
}

// --- 4. WINNER NOTIFICATION (10-SECOND LOGIC) ---
// Highlighting player and showing the win indicator
function displayWinnerSequence(winningMesh) {
    // A. Highlight Player (Update 1.3 Requirement)
    winningMesh.material.emissive.setHex(0x00ff00); 

    // B. Create Winner UI Hologram
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: textures.winnerUI, 
        transparent: true,
        blending: THREE.AdditiveBlending 
    });
    const winnerSprite = new THREE.Sprite(spriteMaterial);
    
    // Position 1.8 units above winning player
    winnerSprite.position.set(winningMesh.position.x, 1.8, winningMesh.position.z);
    winnerSprite.scale.set(2, 1, 1);
    scene.add(winnerSprite);

    // C. 10-Second Countdown to Removal
    setTimeout(() => {
        scene.remove(winnerSprite);
        winningMesh.material.emissive.setHex(0x000000); // Remove highlight
    }, 10000);
}

// --- 5. INITIALIZE WORLD MATERIALS ---
function applyWorldTextures() {
    // Apply Stone Runes to the high-stakes room
    const stoneRoomMat = new THREE.MeshStandardMaterial({ map: textures.stoneWall });
    
    // Apply Brick to the Lobby
    const lobbyWallMat = new THREE.MeshStandardMaterial({ map: textures.brickWall });
    
    // Apply Green Felt to the main table
    const tableSurfaceMat = new THREE.MeshStandardMaterial({ map: textures.felt });
}

// --- END OF MAIN.JS ---
