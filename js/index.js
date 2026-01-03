import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';

const log = document.getElementById('debug-log');

let scene, camera, renderer, world, playerGroup;

try {
    init();
} catch (error) {
    log.innerHTML = `<span style="color:red">CRASH: ${error.message}</span>`;
    console.error(error);
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505); // Near black, but slightly grey

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // POSITIONING: Create a Rig so we don't spawn inside the table
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 2); // 2 meters back from center
    scene.add(playerGroup);
    playerGroup.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    world = new World(scene, renderer, playerGroup);

    log.innerText = "Update 8.0 Active - Ready for VR";
    renderer.setAnimationLoop(render);
}

function render() {
    world.update();
    renderer.render(scene, camera);
}

