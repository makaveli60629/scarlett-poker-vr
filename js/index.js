import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';
import { setupControllers } from './controls.js';
import { handleWinNotification } from './pokerLogic.js';

let scene, camera, renderer;
let userWallet = 5000;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Regular Blue Sky

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 25); // Spawn far back

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Load Modular Files
    createEnvironment(scene, userWallet);
    setupControllers(renderer, scene);

    renderer.setAnimationLoop(render);
}

function render() {
    // AUTO-SIT LOGIC
    // As player walks toward table, lower height to sitting position
    if (camera.position.z < 5) {
        camera.position.y = 1.1;
    } else {
        camera.position.y = 1.6;
    }

    renderer.render(scene, camera);
}

// Global function to trigger a win from anywhere
window.triggerTestWin = () => handleWinNotification("PLAYER 1", "FULL HOUSE");
