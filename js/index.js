import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { HandXRModelFactory } from 'three/addons/webxr/HandXRModelFactory.js';
import { World } from './world.js';

let container, scene, camera, renderer, world;
let hand1, hand2;

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(ARButton.createButton(renderer, { 
        optionalFeatures: ['hand-tracking'] 
    }));

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Initialize the Modular World
    world = new World(scene);

    // Setup Hands (No Controllers)
    const handModelFactory = new HandXRModelFactory();

    hand1 = renderer.xr.getHand(0);
    hand1.add(handModelFactory.createHandModel(hand1, "mesh"));
    scene.add(hand1);

    hand2 = renderer.xr.getHand(1);
    hand2.add(handModelFactory.createHandModel(hand2, "mesh"));
    scene.add(hand2);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    // Pass hand data to the world logic for interaction
    world.update(hand1, hand2);
    renderer.render(scene, camera);
}
