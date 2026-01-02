import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';

let scene, camera, renderer, controller1, controller2;
let wallet = 2500;

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    createEnvironment(scene, wallet);

    // OCULUS CONTROLLERS
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    // CONTROLLER VISUALS
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const laserLine = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x00ffff }));
    laserLine.scale.z = 5;
    controller1.add(laserLine.clone());
    controller2.add(laserLine.clone());

    renderer.setAnimationLoop(render);
}

// WIN POPUP LOGIC (10 SECONDS)
export function showWinNotification(winnerName, handType) {
    const ui = document.createElement('div');
    ui.id = "win-popup";
    ui.style.cssText = `
        position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0,255,0,0.2); border: 2px solid #00ff00;
        padding: 40px; color: white; font-family: 'Courier New';
        text-align: center; font-size: 30px; z-index: 999;
    `;
    ui.innerHTML = `<h1>${winnerName} WINS!</h1><h3>${handType}</h3>`;
    document.body.appendChild(ui);

    // Auto-remove after 10 seconds per requirements
    setTimeout(() => {
        ui.remove();
    }, 10000);
}

// OCULUS AUTO-SIT LOGIC
function updateLogic() {
    // If player walks close to the table (Z-axis -5)
    if (camera.position.z < -5) {
        camera.position.y = 1.2; // Sit the player down
    }
}

function render() {
    updateLogic();
    renderer.render(scene, camera);
}

init();
