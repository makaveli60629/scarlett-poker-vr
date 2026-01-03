import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { PokerWorld } from './world.js';

let scene, camera, renderer, world;

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Dark grey, not pure black

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // SPAWN FIX: Move back 4 meters and up to eye level
    camera.position.set(0, 1.6, 4); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Fix for newer Three.js lighting
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    document.getElementById('canvas-container').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Initialize World
    world = new PokerWorld(scene);

    // Hands Setup (Strictly Hands - No Controllers)
    const handModels = new XRHandModelFactory();
    for (let i = 0; i < 2; i++) {
        const hand = renderer.xr.getHand(i);
        hand.add(handModels.createHandModel(hand, 'mesh'));
        scene.add(hand);
    }

    renderer.setAnimationLoop(render);
    document.getElementById('status').innerText = 'Scarlet VR: Vision Restored';
}

function render() {
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
