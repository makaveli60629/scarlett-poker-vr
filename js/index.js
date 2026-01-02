import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';

let scene, camera, renderer, controller1, controller2;
let playerMoney = 1000;

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.setClearColor(0x000000); // Ensures no light leaks
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Load Textured Environment
    createEnvironment(scene, playerMoney);

    // OCULUS CONTROLLERS
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    // Pointer lines for Oculus
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const pointer = new THREE.Line(lineGeo, lineMat);
    pointer.scale.z = 10;
    controller1.add(pointer.clone());
    controller2.add(pointer.clone());

    animate();
}

// AUTO-SIT LOGIC
function checkPlayerPosition() {
    // If player walks into the "Play" zone
    if (camera.position.z < -2 && camera.position.z > -8) {
        console.log("Auto-Sitting Player...");
        // Locking camera to table height
        camera.position.y = 1.2; 
    }
}

// WIN CONDITION UI (10 Second Display)
export function handleWin(winnerName, handDescription) {
    const announcement = document.createElement('div');
    announcement.style.cssText = `
        position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
        color: #00FF00; font-family: Arial; font-size: 40px; text-shadow: 2px 2px #000;
        z-index: 100; text-align: center;
    `;
    announcement.innerHTML = `WINNER: ${winnerName}<br>${handDescription}`;
    document.body.appendChild(announcement);

    // Highlight logic: Assume 'winnerMesh' is the player's avatar
    // winnerMesh.material.emissive.setHex(0x00ff00);

    setTimeout(() => {
        announcement.remove();
    }, 10000);
}

function animate() {
    renderer.setAnimationLoop(() => {
        checkPlayerPosition();
        renderer.render(scene, camera);
    });
}
