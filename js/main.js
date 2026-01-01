import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- INITIALIZE SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue (Should be visible immediately)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- ROOM LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(5, 10, 5);
scene.add(sun);

// --- GEOMETRY ---
// Simple Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20), 
    new THREE.MeshStandardMaterial({ color: 0x333333 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// The Green Poker Table
const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32), 
    new THREE.MeshStandardMaterial({ color: 0x006400 })
);
table.position.set(0, 0.8, -4);
scene.add(table);

// Floating Wallet (Baby Blue)
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#89CFF0';
ctx.font = '40px Arial';
ctx.fillText('WALLET: $5,000', 10, 50);
const tex = new THREE.CanvasTexture(canvas);
const wallet = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
wallet.position.set(0, 2, -2);
wallet.scale.set(2, 1, 1);
scene.add(wallet);

// --- VR PLAYER SETUP ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

// --- MOVEMENT LOOP ---
function update() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                playerGroup.position.z += axes[3] * 0.05;
                playerGroup.position.x += axes[2] * 0.05;
            }
        }
    }
}

renderer.setAnimationLoop(() => {
    update();
    renderer.render(scene, camera);
});

console.log("Room Rendered Successfully.");
