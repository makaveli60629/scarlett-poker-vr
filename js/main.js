import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// --- CONFIGURATION & STATE ---
const TEXTURE_PATH = 'assets/textures/';
let scene, camera, renderer, controller1, controller2;

init();

function init() {
    // 1. SCENE SETUP
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020); // Dark grey background, not pitch black

    // 2. CAMERA SETUP
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3); // Average human eye height in meters

    // 3. RENDERER SETUP (Critical for VR)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // DO NOT REMOVE: Enables VR mode
    document.body.appendChild(renderer.domElement);

    // 4. ADD VR BUTTON
    document.body.appendChild(VRButton.createButton(renderer));

    // 5. LIGHTING (Fixes the "Dark Browser" issue)
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(5, 10, 7.5);
    scene.add(sunLight);

    // 6. OCULUS CONTROLLERS LOGIC
    setupControllers();

    // 7. INITIAL GAME OBJECTS (Lobby/Table Placeholder)
    createLobby();

    // 8. START ANIMATION LOOP
    renderer.setAnimationLoop(render);
}

function setupControllers() {
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();
    
    // Left Controller Grip
    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(controllerModelFactory.createControllerModel(grip1));
    scene.add(grip1);

    // Right Controller Grip
    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(controllerModelFactory.createControllerModel(grip2));
    scene.add(grip2);
}

function onSelectStart(event) {
    // Logic for "Play Game" - automatically sit down and get cards
    console.log("Controller Trigger Pressed: Joining Table...");
    // Future Logic: move camera/player to seat position
}

function createLobby() {
    // Basic floor to ensure you aren't floating in a void
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Placeholder Table
    const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x006600 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.8, 0);
    scene.add(table);
}

function render() {
    // Every update, check for logic (particles, logic updates)
    renderer.render(scene, camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
