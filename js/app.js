import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let camera, scene, renderer, controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster = new THREE.Raycaster();
let intersectPoint = new THREE.Vector3();

// Stability 1.38 Assets
let floor, table, chair;
const winOverlay = document.getElementById('win-overlay');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020210); // Deep Space Blue
    
    // Camera Setup
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3);

    // Renderer & VR
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).castShadow = true;
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 2));

    // --- BUILD ENVIRONMENT ---

    // 1. The Carpet (Red/Patterned Shader Placeholder)
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x800000, // Deep Red Carpet
        roughness: 0.8,
        metalness: 0.2
    });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.name = "Floor_Carpet";
    scene.add(floor);

    // 2. The Poker Table
    const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 40);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x004400 });
    table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.8;
    scene.add(table);

    // 3. "Play Game" Trigger / Chair
    const chairGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(0, 0.4, 1.8);
    chair.name = "play_game"; // Looking for this for auto-sit
    scene.add(chair);

    // Oculus Controllers
    setupVRControllers();

    // Start Animation
    renderer.setAnimationLoop(render);
}

function setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // Controller 1
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onTeleportStart);
    scene.add(controller1);

    // Controller 2
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', triggerWinState); // Map to one button for testing
    scene.add(controller2);

    // Grips (Models)
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
}

// Logic: Move to "Play Game" = Auto Sit
function onTeleportStart() {
    // Check if looking at the play game area
    // Simplified: If you trigger near the chair, you snap to it
    const playerPos = new THREE.Vector3();
    camera.getWorldPosition(playerPos);

    if (playerPos.distanceTo(chair.position) < 2.0) {
        // Snaps camera to chair height and position
        const baseReference = renderer.xr.getReferenceSpace();
        if (baseReference) {
            // Logic to offset the XR space so you are "sitting"
            console.log("Auto-sitting initiated...");
            snapToSeat();
        }
    }
}

function snapToSeat() {
    // Teleport logic for VR Camera offset
    const offsetPosition = { x: 0, y: -0.8, z: -1.8 }; // Adjust to fit table
    // Apply offset to camera group
}

// Requirement: Win State Popup for 10 Seconds
export function triggerWinState(playerName, handRank) {
    winOverlay.innerText = `${playerName} WINS WITH ${handRank}!`;
    winOverlay.style.display = "block";
    
    // Highlight table/player
    table.material.emissive.setHex(0x00ff00);

    setTimeout(() => {
        winOverlay.style.display = "none";
        table.material.emissive.setHex(0x000000);
    }, 10000);
}

function render() {
    // Mega Particle Logic (Placeholder for 1.5.1)
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
