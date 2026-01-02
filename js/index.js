import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';
import { setupControllers, handleMovement } from './controls.js';
import { generateTables } from './tableGenerator.js';

let scene, camera, renderer, controls;
let userWallet = 5000;

// Update 1.6.4: Safety Handshake for Oculus Browser
init();

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue Fallback

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 1.6, 80); // Spawn at the back of the 200x200 room

    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true // Crucial for Oculus layer rendering
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    document.body.appendChild(renderer.domElement);

    // Official VR Button with fixed styling for visibility
    const vButton = VRButton.createButton(renderer);
    vButton.style.background = "#00ffff"; 
    vButton.style.color = "#000";
    document.body.appendChild(vButton);

    // Global Light fix
    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);

    // Load Modules
    createEnvironment(scene, userWallet);
    controls = setupControllers(renderer, scene);
    generateTables(scene);

    renderer.setAnimationLoop(render);
}

function render() {
    // Check if the session is active before processing movement
    if (renderer.xr.isPresenting) {
        handleMovement(renderer, camera, controls);

        // Auto-Sit logic for the large room
        const relativeZ = Math.abs(camera.position.z % 250);
        if (relativeZ < 15) {
            camera.position.y = 1.1; // Sits at the table
        } else {
            camera.position.y = 1.6; // Walking height
        }
    }

    renderer.render(scene, camera);
}
