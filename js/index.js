import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';
import { setupControllers, handleMovement } from './controls.js';
import { generateTables } from './tableGenerator.js';

let scene, camera, renderer, controls;
let userWallet = 5000;

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    // SPAWN FIX: Move back so you aren't inside the table
    camera.position.set(0, 1.6, 40); 

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    createEnvironment(scene, userWallet);
    controls = setupControllers(renderer, scene);
    generateTables(scene);

    renderer.setAnimationLoop(render);
}

function render() {
    // Thumbstick movement logic
    handleMovement(renderer, camera, controls);

    // Auto-Sit logic (Lowers height when near table)
    const relativeZ = Math.abs(camera.position.z % 110);
    if (relativeZ < 6) { 
        camera.position.y = 1.1; 
    } else { 
        camera.position.y = 1.6; 
    }

    renderer.render(scene, camera);
}
