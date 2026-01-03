import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';

let scene, camera, renderer, world;

try {
    init();
} catch (e) {
    console.error("Initialization Failed:", e);
    document.getElementById('overlay').innerText = "Error: " + e.message;
}

function init() {
    scene = new THREE.Scene();
    // TEMP: Set to Red. If you see Red, your code is working!
    scene.background = new THREE.Color(0xff0000); 

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3); // Move camera back so we aren't "inside" things

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    document.body.appendChild(renderer.domElement);
    
    // Add the VR Button
    const btn = VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);

    world = new World(scene, renderer);

    renderer.setAnimationLoop(render);
}

function render() {
    world.update();
    renderer.render(scene, camera);
}
