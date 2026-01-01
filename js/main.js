import * as THREE from 'three';
import { Physics } from './Physics.js';

// --- INITIALIZATION ---
const physics = new Physics();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// --- LUXURY ROOM BUILDER (4m Ceilings & Brick Walls) ---
const brickMat = new THREE.MeshStandardMaterial({ color: 0x4d1a1a, roughness: 0.9 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });

function buildLuxuryRoom(name, x, z, size, lightColor) {
    const room = new THREE.Group();

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x111111}));
    floor.rotation.x = -Math.PI / 2;
    room.add(floor);

    // Ceiling (4 Meters High)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x050505}));
    ceil.position.y = 4;
    ceil.rotation.x = Math.PI / 2;
    room.add(ceil);

    // Walls (Brick)
    const wallGeo = new THREE.BoxGeometry(size, 4, 0.5);
    const backWall = new THREE.Mesh(wallGeo, brickMat);
    backWall.position.set(0, 2, -size/2);
    room.add(backWall);
    physics.addCollider(backWall);

    // Luxury Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 16);
    const p1 = new THREE.Mesh(pillarGeo, goldMat);
    p1.position.set(-size/2 + 0.5, 2, -size/2 + 0.5);
    room.add(p1);

    // Room Atmosphere Light
    const pointLight = new THREE.PointLight(lightColor, 2, 15);
    pointLight.position.set(0, 3.5, 0);
    room.add(pointLight);

    room.position.set(x, 0, z);
    scene.add(room);
}

// Create Rooms
buildLuxuryRoom("Lobby", 0, 0, 20, 0x00f2ff);   // Daily Pick Table Here
buildLuxuryRoom("Store", -22, 0, 15, 0xff00ff); // Item Shop
buildLuxuryRoom("Poker", 22, 0, 15, 0x00ff00);  // High Stakes Room
buildLuxuryRoom("Vault", 0, 22, 15, 0xffd700);  // The Dark Vault Fix

// --- DAILY PICK TABLE (Lobby - $500 Increments) ---
const dailyTable = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8), goldMat);
dailyTable.position.set(0, 0.4, -5);
scene.add(dailyTable);
physics.addCollider(dailyTable);

// --- BRANDED POKER TABLE ---
const tableGroup = new THREE.Group();
const pokerTable = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2), new THREE.MeshStandardMaterial({color: 0x076324}));
pokerTable.position.y = 0.8;
tableGroup.add(pokerTable);

// Branding Logo Placeholder
const logo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({color: 0xffffff}));
logo.rotation.x = -Math.PI / 2;
logo.position.y = 0.91; 
tableGroup.add(logo);

tableGroup.position.set(22, 0, 0);
scene.add(tableGroup);

// --- OCULUS CONTROLS: RIGHT TRIGGER = OK ---
const controller1 = renderer.xr.getController(0); // Right
scene.add(controller1);

controller1.addEventListener('selectstart', () => {
    console.log("Right Trigger: OK Activated");
    
    // Check if looking at Daily Pick Table
    if (camera.position.distanceTo(dailyTable.position) < 2) {
        claimDailyPick();
    }
});

// --- WALLET & WINNER UI ---
let wallet = 5000;
function claimDailyPick() {
    if (wallet < 5000) {
        wallet += 500;
        console.log("Claimed $500! Total: $" + wallet);
        updateWalletHologram();
    }
}

function updateWalletHologram() {
    // Wallet Hologram logic (Canvas Texture)
}

renderer.setAnimationLoop(() => {
    // Prevent walking through walls
    if (physics.isColliding(camera.position)) {
        // Simple kickback logic to stop player
    }
    renderer.render(scene, camera);
});
