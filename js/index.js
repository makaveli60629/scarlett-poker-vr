import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { PokerWorld } from './world.js';

/**
 * SCARLET POKER VR - Core Logic
 * Requirements: Hands-only, High-intensity lighting, Win-state UI
 */

let scene, camera, renderer, world;

async function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Subtle dark grey

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Positioned 3 meters back and 1.6 meters up (human height)
    camera.position.set(0, 1.6, 3); 

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Crucial for modern Three.js lighting
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // 4. Initialize World (The room, table, and lights)
    try {
        world = new PokerWorld(scene);
        console.log("World initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize World:", error);
    }

    // 5. Hand Tracking Setup (Per user requirement: Hands only)
    const handModels = new XRHandModelFactory();
    
    // Left Hand
    const hand1 = renderer.xr.getHand(0);
    hand1.add(handModels.createHandModel(hand1, 'mesh'));
    scene.add(hand1);

    // Right Hand
    const hand2 = renderer.xr.getHand(1);
    hand2.add(handModels.createHandModel(hand2, 'mesh'));
    scene.add(hand2);

    // 6. Start the Loop
    renderer.setAnimationLoop(render);
    
    // Update UI Status
    const statusEl = document.getElementById('status');
    if(statusEl) statusEl.innerText = 'Scarlet VR: Active';
}

function render() {
    // Hand logic or animations would go here
    renderer.render(scene, camera);
}

// Winning UI Logic (Requirement 2025-12-31)
export function triggerWin(winnerName) {
    const display = document.getElementById('winner-display');
    if (display) {
        display.innerText = `${winnerName} WINS!`;
        display.style.display = 'block';
        setTimeout(() => {
            display.style.display = 'none';
        }, 10000);
    }
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Run Init
init().catch(err => console.error("Initialization Error:", err));
