import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PokerWorld } from './world.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let scene, camera, renderer, world;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 2); // Average eye height

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Initialize World logic
    world = new PokerWorld(scene);

    // Setup Hands (No Controllers)
    const handModels = new XRHandModelFactory();
    
    // Left Hand
    const hand1 = renderer.xr.getHand(0);
    hand1.add(handModels.createHandModel(hand1, 'mesh'));
    scene.add(hand1);

    // Right Hand
    const hand2 = renderer.xr.getHand(1);
    hand2.add(handModels.createHandModel(hand2, 'mesh'));
    scene.add(hand2);

    animate();
}

function animate() {
    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });
}

// Win Display Logic (Requirement from 2025-12-31)
export function showWinner(name) {
    const el = document.getElementById('winner-display');
    el.innerText = `${name} WINS THE POT!`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 10000);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
