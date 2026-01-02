import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

let scene, camera, renderer, world, userGroup;

init();

function init() {
    // 1. Core Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505); // Deep dark grey, not pure black

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    
    // 2. User/Camera Group (The "Spawn" point)
    userGroup = new THREE.Group();
    userGroup.position.set(0, 0, 1.5); // Start 1.5m back from center
    scene.add(userGroup);
    userGroup.add(camera);

    // 3. Renderer & VR
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // 4. Global Lighting (Ensures visibility)
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(2, 5, 2);
    scene.add(sun);

    // 5. Hand Tracking Integration (NO CONTROLLERS)
    const handModelFactory = new XRHandModelFactory();
    const hand1 = renderer.xr.getHand(0);
    hand1.add(handModelFactory.createHandModel(hand1, "mesh"));
    scene.add(hand1);

    const hand2 = renderer.xr.getHand(1);
    hand2.add(handModelFactory.createHandModel(hand2, "mesh"));
    scene.add(hand2);

    // 6. Load World Logic
    world = new World(scene);

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(render);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(time) {
    world.update(time);
    renderer.render(scene, camera);
}
