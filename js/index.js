import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';

let scene, camera, renderer, controller1, controller2;
let currentWallet = 2500;

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 20); // View from a distance

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Load Environment with assets/textures/ pathing
    createEnvironment(scene, currentWallet);

    // OCULUS CONTROLS
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    // Red Laser Pointers for VR
    const laserMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
    const line = new THREE.Line(laserGeo, laserMat);
    controller1.add(line.clone());
    controller2.add(line.clone());

    renderer.setAnimationLoop(update);
}

// WINNER UI - 10 SECOND HIGHLIGHT
export function announceWinner(name, hand) {
    const winBox = document.createElement('div');
    winBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8); border: 4px solid #00FF00;
        padding: 60px; color: gold; font-family: 'Arial Black'; font-size: 40px;
        text-align: center; z-index: 1000;
    `;
    winBox.innerHTML = `WINNER: ${name}<br><small>${hand}</small>`;
    document.body.appendChild(winBox);

    // 10 second timeout per instructions
    setTimeout(() => {
        winBox.remove();
    }, 10000);
}

function update
