import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';

let scene, camera, renderer, world;

init();

function init() {
    scene = new THREE.Scene();
    // FIX: Set a background color so you know the scene is rendering
    scene.background = new THREE.Color(0x87ceeb); // Sky Blue

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Initialize the world components (Table, Lights, Hands)
    world = new World(scene, renderer);

    renderer.setAnimationLoop(render);
}

function render() {
    world.update();
    renderer.render(scene, camera);
}
