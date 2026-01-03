import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';

let scene, camera, renderer, world, playerGroup;

try {
    init();
} catch (e) {
    document.getElementById('status').innerHTML = "Error: " + e.message;
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222); // Dark grey room

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // PLAYER RIG: This allows movement
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 2); // Spawn 2 meters back from the center
    scene.add(playerGroup);
    playerGroup.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    world = new World(scene, renderer, playerGroup);

    document.getElementById('status').innerText = "Update 8.0 Ready. Enter VR.";
    renderer.setAnimationLoop(render);
}

function render() {
    world.update();
    renderer.render(scene, camera);
}
