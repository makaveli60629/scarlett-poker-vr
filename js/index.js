import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';

let scene, camera, renderer, controller1, controller2;
let wallet = 2500;

function init() {
    scene = new THREE.Scene();
    
    // Character Rig & Camera Setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // SPAWN POINT: Centered (x=0), Standing Height (y=1.6), Away from table (z=25)
    camera.position.set(0, 1.6, 25);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Build centered environment
    createEnvironment(scene, wallet);

    // OCULUS CONTROLLERS
    setupControllers();

    renderer.setAnimationLoop(render);
}

function setupControllers() {
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    const laserLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]),
        new THREE.LineBasicMaterial({ color: 0x00ffff })
    );
    controller1.add(laserLine.clone());
    controller2.add(laserLine.clone());
}

// WINNER UI (10 SECONDS)
export function showWinner(name, hand) {
    const winUI = document.createElement('div');
    winUI.style.cssText = `
        position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.85); border: 5px solid #00FF00;
        padding: 50px; color: gold; font-family: sans-serif; text-align: center;
    `;
    winUI.innerHTML = `<h1>${name} WINS!</h1><h2>${hand}</h2>`;
    document.body.appendChild(winUI);

    setTimeout(() => winUI.remove(), 10000);
}

function render() {
    // AUTO-SIT LOGIC: When player approaches the table area
    if (camera.position.z < 5) {
        camera.position.y = 1.1; // Seated height
    } else {
        camera.position.y = 1.6; // Standing height
    }
    
    renderer.render(scene, camera);
}

init();
