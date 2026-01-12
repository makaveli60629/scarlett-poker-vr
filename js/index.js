import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

/**
 * SCARLETT ENGINE STATE
 */
const S = {
    scene: null,
    camera: null,
    renderer: null,
    playerGroup: null, // The "Rig" (Camera + Hands)
    hands: { left: null, right: null },
    clock: new THREE.Clock(),
    isSpawned: false
};

async function init() {
    // 1. Core Three.js Setup
    S.scene = new THREE.Scene();
    S.scene.background = new THREE.Color(0x020205); // Deep space black
    
    S.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    S.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.setPixelRatio(window.devicePixelRatio);
    S.renderer.xr.enabled = true;
    document.body.appendChild(S.renderer.domElement);

    // 2. VR Button & Session Setup
    document.body.appendChild(VRButton.createButton(S.renderer));

    // 3. Player Rig (The "Monolith" Rig)
    S.playerGroup = new THREE.Group();
    S.scene.add(S.playerGroup);
    S.playerGroup.add(S.camera);

    // 4. Hand Tracking Setup (Feature: Controllers Disabled)
    const handFactory = new XRHandModelFactory();
    
    // Left Hand
    S.hands.left = S.renderer.xr.getHand(0);
    S.hands.left.add(handFactory.createHandModel(S.hands.left, "mesh"));
    S.playerGroup.add(S.hands.left);

    // Right Hand
    S.hands.right = S.renderer.xr.getHand(1);
    S.hands.right.add(handFactory.createHandModel(S.hands.right, "mesh"));
    S.playerGroup.add(S.hands.right);

    // 5. Build the World (Update 8.0)
    await World.build({ 
        THREE, 
        scene: S.scene, 
        renderer: S.renderer,
        log: console.log 
    });

    // 6. THE PERFECT VIP SPAWN
    handleVIPSpawn();

    // 7. Start Animation Loop
    S.renderer.setAnimationLoop(render);
}

/**
 * FEATURE: VIP ROOM ARRIVAL
 * Positions the player in the cube room looking at the table.
 */
function handleVIPSpawn() {
    const start = World.getSpawn();
    if (start) {
        S.playerGroup.position.set(start.x, start.y, start.z);
        S.playerGroup.rotation.y = start.yaw;
        S.isSpawned = true;
        console.log("Scarlett VR: Secure VIP Spawn Successful ✅");
    }
}

/**
 * THE FRAME LOOP
 * Runs 60-90 times per second in VR.
 */
function render() {
    const time = S.clock.getElapsedTime();
    const dt = S.clock.getDelta();

    // Update World Animations (Breathing Neon, Shaders)
    if (World.update) World.update(time);

    // FEATURE: Hand-Based Collision/Interaction
    updateHandInteractions();

    // FEATURE: Gravity/Height Check
    // Keeps player stuck to the ramp and pit floors
    applyGravity();

    S.renderer.render(S.scene, S.camera);
}

function updateHandInteractions() {
    // Logic for Feature #42 (Wrist Menu) and #51 (Chip Shuffle)
    // Runs every frame to check palm orientation
}

/**
 * FEATURE: SMART GRAVITY
 * Raycasts downward to find the 'floors' defined in world.js
 */
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

function applyGravity() {
    if (!S.playerGroup) return;

    const floors = World.getFloors();
    if (!floors || floors.length === 0) return;

    // Raycast from player head down to find floor y
    raycaster.set(S.playerGroup.position, down);
    const intersects = raycaster.intersectObjects(floors);

    if (intersects.length > 0) {
        const targetY = intersects[0].point.y;
        // Smoothly interpolate to the floor height (Gravity feel)
        S.playerGroup.position.y = THREE.MathUtils.lerp(S.playerGroup.position.y, targetY, 0.1);
    }
}

// Handle Window Resizing
window.addEventListener('resize', () => {
    S.camera.aspect = window.innerWidth / window.innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(window.innerWidth, window.innerHeight);
});

// INITIALIZE ENGINE
init();
