import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';

let scene, camera, renderer, controller1, controller2;
let playerMoney = 1000; // Update 1.2 Wallet

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Load Environment
    createEnvironment(scene, playerMoney);

    // Oculus Controllers Setup
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    scene.add(controller2);

    // Add visual pointers for Oculus
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const line = new THREE.Line(lineGeo);
    line.scale.z = 5;
    controller1.add(line.clone());
    controller2.add(line.clone());

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onSelectStart() {
    // VR Interaction Logic for 1.5.1 Start Button
    console.log("Controller Triggered");
}

// Update 1.5.2 Logic: Auto-Sit and Game Start
function checkPlayerPosition() {
    // If player moves to "Play Game" area (e.g., center of room)
    if (camera.position.z < -5 && camera.position.z > -15) {
        sitDownAndDeal();
    }
}

function sitDownAndDeal() {
    // Logic for locking camera to chair and dealing cards
    console.log("Player is seated. Dealing cards...");
}

// Logic for Win Notification (10-second pop-up)
export function showWinner(playerName, handRank) {
    const winDiv = document.createElement('div');
    winDiv.style.position = 'absolute';
    winDiv.style.top = '50%';
    winDiv.style.left = '50%';
    winDiv.style.transform = 'translate(-50%, -50%)';
    winDiv.style.color = 'gold';
    winDiv.style.fontSize = '50px';
    winDiv.style.fontWeight = 'bold';
    winDiv.innerHTML = `${playerName} WINS WITH ${handRank}!`;
    document.body.appendChild(winDiv);

    // Highlight winning player (Pseudo-code for mesh highlight)
    // winningPlayerMesh.material.emissive.setHex(0x00ff00);

    setTimeout(() => {
        winDiv.remove();
    }, 10000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(() => {
        checkPlayerPosition();
        renderer.render(scene, camera);
    });
}
