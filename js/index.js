import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';
import { setupControllers } from './controls.js';
import { generateTables } from './tableGenerator.js';

let scene, camera, renderer;
let userWallet = 5000;

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 1.6, 25); 

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    createEnvironment(scene, userWallet);
    setupControllers(renderer, scene);
    generateTables(scene); // Adds branded tables to all rooms

    renderer.setAnimationLoop(render);
}

function render() {
    // Portal Check
    if (camera.position.z % 110 < -45) { camera.position.z -= 20; }

    // Auto-Sit logic
    const relativeZ = Math.abs(camera.position.z % 110);
    if (relativeZ < 8) { camera.position.y = 1.1; } 
    else { camera.position.y = 1.6; }

    renderer.render(scene, camera);
}
