import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// --- 1. SETUP & HISTORY PRESERVATION ---
// Update 1.3: Logic Complete. Preparing for 1.4 Textures.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraGroup = new THREE.Group(); 
scene.add(cameraGroup);
cameraGroup.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- 2. THE SPEECH ENGINE (Game Voice) ---
function gameSpeak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

// --- 3. FIXING CAMERA HEIGHT (The "Mesh" Issue) ---
// This moves you from the floor to the "Sitting" position at the table
function initializePlayerPosition() {
    cameraGroup.position.set(0, 1.2, 2); // 1.2 is sitting height
    camera.lookAt(0, 1, 0); 
    gameSpeak("System initialized. Player seated at table one.");
}

// --- 4. OCULUS CONTROLLERS ---
const controllerModelFactory = new XRControllerModelFactory();
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
cameraGroup.add(controller1, controller2);

const grip1 = renderer.xr.getControllerGrip(0);
grip1.add(controllerModelFactory.createControllerModel(grip1));
cameraGroup.add(grip1);

const grip2 = renderer.xr.getControllerGrip(1);
grip2.add(controllerModelFactory.createControllerModel(grip2));
cameraGroup.add(grip2);

// --- 5. TABLE & ASSETS (Placeholder for 1.4 Textures) ---
const tableGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x114411, wireframe: false });
const table = new THREE.Mesh(tableGeo, tableMat);
scene.add(table);

// --- 6. LIGHTING ---
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 5, 0);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// --- RENDER LOOP ---
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
});

// Run seating and voice welcome
initializePlayerPosition();
