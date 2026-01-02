import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';
import { setupControllers, handleMovement } from './controls.js';
import { generateTables } from './tableGenerator.js';

// Global variables
let scene, camera, renderer, xrControls;
let playerWallet = 5000;

// Initialize when the script loads
init().catch(err => {
    console.error("Critical Engine Failure:", err);
    alert("Game failed to load. Check console for details.");
});

async function init() {
    // 1. Scene & Skybox
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

    // 2. Camera Setup (The Rig)
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    // SPAWN POSITION: X=0, Y=1.6 (Human Height), Z=80 (Way back from the table)
    camera.position.set(0, 1.6, 80); 

    // 3. Renderer Setup (Optimized for Oculus Browser)
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Add the canvas to the webpage
    document.body.appendChild(renderer.domElement);

    // 4. VR Button Handshake
    const vrButtonElement = VRButton.createButton(renderer);
    vrButtonElement.style.background = "#00ffff"; // Cyan for visibility
    vrButtonElement.style.color = "#000";
    document.body.appendChild(vrButtonElement);

    // 5. Lighting (Bright enough to see everything clearly)
    const light = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(light);

    // 6. Load Game Modules
    // These functions are imported from your other JS files
    createEnvironment(scene, playerWallet);
    xrControls = setupControllers(renderer, scene);
    generateTables(scene);

    // 7. Start the Game Loop
    renderer.setAnimationLoop(gameLoop);
    
    console.log("Poker Engine 1.6.5: Online & Centered");
}

function gameLoop() {
    // Only run movement/logic if we are actually in VR
    if (renderer.xr.isPresenting) {
        // Handle Oculus Thumbstick movement
        handleMovement(renderer, camera, xrControls);

        // AUTO-SIT LOGIC
        // Rooms are spaced 250 units apart. 
        // We check distance from the center of the current room.
        const roomCenterZ = Math.round(camera.position.z / 250) * 250;
        const distFromCenter = Math.abs(camera.position.z - roomCenterZ);

        if (distFromCenter < 10) {
            camera.position.y = 1.1; // Seated height at table
        } else {
            camera.position.y = 1.6; // Walking height
        }
    }

    // Always render the frame
    renderer.render(scene, camera);
}

// Global function to trigger winner popups (10 second rule)
window.announceWinner = (name, hand) => {
    const ui = document.getElementById('win-ui');
    if (ui) {
        ui.innerHTML = `<div style="background:rgba(0,0,0,0.8); color:gold; padding:50px; text-align:center; border:5px solid #00ffff;">
            <h1>${name} WINS!</h1>
            <p>${hand}</p>
        </div>`;
        ui.style.display = 'block';
        setTimeout(() => { ui.style.display = 'none'; }, 10000);
    }
};
