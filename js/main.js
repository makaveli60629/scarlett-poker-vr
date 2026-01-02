import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Dark grey, not pure black

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraGroup = new THREE.Group(); 
scene.add(cameraGroup);
cameraGroup.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- 1. FLOOR & ENVIRONMENT ---
// This creates a solid ground so you know where you are.
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); 
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; 
scene.add(floor);

// A simple grid to help with depth perception
const grid = new THREE.GridHelper(100, 100, 0x00ff00, 0x444444);
scene.add(grid);

// --- 2. THE CAMERA (SET TO FLOOR) ---
// Per your request: Camera is back at 0, 0, 0 (The Floor)
cameraGroup.position.set(0, 0, 0); 

// --- 3. LOCOMOTION (Oculus Thumbstick) ---
let controller1, controller2;
const speed = 0.05;

function handleLocomotion() {
    if (renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        if (session && session.inputSources) {
            session.inputSources.forEach((source) => {
                if (source.gamepad && source.handedness === 'left') {
                    // Left Stick for Movement
                    const axes = source.gamepad.axes; // [0]=x, [1]=y
                    cameraGroup.position.x += axes[2] * speed;
                    cameraGroup.position.z += axes[3] * speed;
                }
            });
        }
    }
}

// --- 4. OCULUS CONTROLLERS ---
const controllerModelFactory = new XRControllerModelFactory();
controller1 = renderer.xr.getController(0);
controller2 = renderer.xr.getController(1);
cameraGroup.add(controller1, controller2);

const grip1 = renderer.xr.getControllerGrip(0);
grip1.add(controllerModelFactory.createControllerModel(grip1));
cameraGroup.add(grip1);

const grip2 = renderer.xr.getControllerGrip(1);
grip2.add(controllerModelFactory.createControllerModel(grip2));
cameraGroup.add(grip2);

// --- 5. LIGHTING ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 2));

// --- RENDER LOOP ---
renderer.setAnimationLoop(() => {
    handleLocomotion(); // Run movement every frame
    renderer.render(scene, camera);
});

// SPEECH CONFIRMATION
function announce(text) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
}
announce("Locomotion active. Camera reset to floor level.");
