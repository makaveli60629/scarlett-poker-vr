import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); // Very dark grey instead of pure black

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3); // Default standing height

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- LIGHTING (FIXES THE "BLACK SCREEN" ISSUE) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Base light for visibility
scene.add(ambientLight);

const tableLight = new THREE.PointLight(0x00F0FF, 2, 10); // Neon Blue highlight
tableLight.position.set(0, 3, -2);
scene.add(tableLight);

// --- ENVIRONMENT & ASSETS ---
// Floor
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// The Table (Play Game Area)
const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const table = new THREE.Mesh(tableGeo, tableMat);
table.position.set(0, 0.8, -2);
scene.add(table);

// Wallet Hologram Display
function createHologram() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00F0FF';
    ctx.font = '40px Arial';
    ctx.fillText('WALLET: $5,000', 10, 50);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2, -4);
    sprite.scale.set(2, 1, 1);
    scene.add(sprite);
}
createHologram();

// --- OCULUS CONTROLLERS & MOVEMENT ---
const controllerModelFactory = new XRControllerModelFactory();

// Right Controller (Movement/Interaction)
const controller1 = renderer.xr.getController(0);
scene.add(controller1);

// Left Controller (Movement/Interaction)
const controller2 = renderer.xr.getController(1);
scene.add(controller2);

// Logic to check if player "Walks" to the table
function updateMovement() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad) {
                const axes = source.gamepad.axes; 
                // Thumbstick Movement
                camera.position.z += axes[3] * 0.05;
                camera.position.x += axes[2] * 0.05;

                // Auto-Sit Trigger
                const distToTable = camera.position.distanceTo(table.position);
                if (distToTable < 1.2) {
                    camera.position.set(0, 1.1, -1.2); // Force "Sit" position
                    console.log("Player Seated - Dealing Cards...");
                }
            }
        }
    }
}

// --- ANIMATION LOOP ---
renderer.setAnimationLoop(() => {
    updateMovement();
    renderer.render(scene, camera);
});
