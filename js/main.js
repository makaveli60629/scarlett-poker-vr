import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraGroup = new THREE.Group(); 
scene.add(cameraGroup);
cameraGroup.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true; // CRITICAL: Enables WebXR
document.body.appendChild(renderer.domElement);

// --- VR BUTTON SETUP ---
// This places the button and forces it to show
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// --- 1. THE FLOOR (Fixing the Green Wire Mesh) ---
// We create a solid dark floor so you don't feel lost in the grid.
const floorGeo = new THREE.CircleGeometry(20, 32);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ff88, 0x222222);
scene.add(grid);

// --- 2. CAMERA STARTING POSITION ---
// Resetting you to the floor as requested
cameraGroup.position.set(0, 0, 0); 

// --- 3. LOCOMOTION LOGIC ---
const speed = 0.05;
function updateLocomotion() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes; 
                // axes[2] is Left/Right, axes[3] is Forward/Back
                cameraGroup.position.x += axes[2] * speed;
                cameraGroup.position.z += axes[3] * speed;
            }
        }
    }
}

// --- 4. OCULUS CONTROLLERS ---
const controllerModelFactory = new XRControllerModelFactory();
const c1 = renderer.xr.getController(0);
const c2 = renderer.xr.getController(1);
cameraGroup.add(c1, c2);

const g1 = renderer.xr.getControllerGrip(0);
g1.add(controllerModelFactory.createControllerModel(g1));
cameraGroup.add(g1);

const g2 = renderer.xr.getControllerGrip(1);
g2.add(controllerModelFactory.createControllerModel(g2));
cameraGroup.add(g2);

// --- 5. LIGHTING ---
const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const point = new THREE.PointLight(0x00ff88, 1, 10);
point.position.set(0, 2, 0);
scene.add(point);

// --- 6. SPEECH (Update 1.3 Logic) ---
function speak(msg) {
    const speech = new SpeechSynthesisUtterance(msg);
    window.speechSynthesis.speak(speech);
}

// --- RENDER LOOP ---
renderer.setAnimationLoop(() => {
    updateLocomotion();
    renderer.render(scene, camera);
});

// Welcome message
window.addEventListener('click', () => {
    speak("System ready. Use left thumbstick to move.");
});
