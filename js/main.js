import * as THREE from 'three';
import { PhysicsEngine } from './Physics.js';

// --- INITIALIZATION ---
const physics = new PhysicsEngine();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING (FIX FOR DARK VAULT) ---
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

// --- WORLD BUILDING (4m Ceilings, Brick Walls) ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brick Red
const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

function buildRoom(name, x, z, size, color) {
    const roomGroup = new THREE.Group();
    
    // Floor & Ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), floorMat);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), floorMat);
    ceil.position.y = 4; // 4 Meters high
    
    // Walls
    const wallGeo = new THREE.BoxGeometry(size, 4, 0.5);
    const wall1 = new THREE.Mesh(wallGeo, wallMat);
    wall1.position.set(0, 2, -size/2);
    
    roomGroup.add(floor, ceil, wall1);
    roomGroup.position.set(x, 0, z);
    scene.add(roomGroup);
    
    physics.addCollider(wall1); // Make it solid
    
    // Add light to each room specifically
    const light = new THREE.PointLight(0xffffff, 1, 15);
    light.position.set(x, 3.5, z);
    scene.add(light);
}

// Create: Lobby, Store, Poker, and the Vault
buildRoom("Lobby", 0, 0, 15, 0x444444);
buildRoom("Store", -18, 0, 12, 0x224422);
buildRoom("Poker", 18, 0, 12, 0x442222);
buildRoom("Vault", 0, 18, 12, 0x111111);

// --- WALLET HOLOGRAM (Zone Area) ---
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#00f2ff';
ctx.font = 'Bold 40px Arial';
ctx.fillText('WALLET: $5,000', 10, 50);
const tex = new THREE.CanvasTexture(canvas);
const hologram = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
hologram.position.set(12, 2.5, 0); // At the entrance of Poker Zone
hologram.scale.set(2, 1, 1);
scene.add(hologram);

// --- OCULUS CONTROLLERS ---
const controller1 = renderer.xr.getController(0); // Right Hand
const controller2 = renderer.xr.getController(1); // Left Hand

// RIGHT TRIGGER = OK / ACTIVATE
controller1.addEventListener('selectstart', () => {
    console.log("Trigger Pressed - Activating...");
    // Trigger menu options: "Buy from Store", "Sit Down", etc.
});

// GRIP = GRAB
controller1.addEventListener('squeezestart', () => {
    console.log("Grip Pressed - Grabbing...");
});

// --- WINNER LOGIC ---
window.showWinner = function(name, hand) {
    const el = document.getElementById('win-notification');
    document.getElementById('winner-name').innerText = name + " WINS";
    document.getElementById('winner-hand').innerText = hand;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 10000);
};

// --- RENDER LOOP ---
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
});
