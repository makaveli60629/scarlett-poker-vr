import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- CORE SYSTEM ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- PLAYER RIG (Update 1.6 Physics Ready) ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

// --- 1.3/1.4 ENVIRONMENT & TEXTURES ---
const loader = new THREE.TextureLoader();
const brickTex = loader.load('assets/texture/brick.jpg');
const feltTex = loader.load('assets/texture/felt.jpg');

const wallMat = new THREE.MeshStandardMaterial({ map: brickTex, color: 0x8B4513 });
const tableMat = new THREE.MeshStandardMaterial({ map: feltTex, color: 0x006400 });

// 4 Walls
const wallGeo = new THREE.PlaneGeometry(20, 10);
const walls = [
    {z: -10, r: 0}, {z: 10, r: Math.PI}, {x: -10, r: Math.PI/2}, {x: 10, r: -Math.PI/2}
];
walls.forEach(d => {
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(d.x || 0, 5, d.z || 0);
    w.rotation.y = d.r;
    scene.add(w);
});

// The Poker Table
const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), tableMat);
table.position.set(0, 0.8, -4);
scene.add(table);

// Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));

// --- 1.5 POKER LOGIC (Win Indicators) ---
const winUI = new THREE.Group();
scene.add(winUI);

function showWinner(message) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0,0,512,128);
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.font = 'Bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, 256, 80);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sprite.position.set(0, 2.5, -4);
    sprite.scale.set(3, 0.75, 1);
    winUI.add(sprite);

    // Auto-remove after 10 seconds (per your request)
    setTimeout(() => { winUI.remove(sprite); }, 10000);
}

// --- 1.4 WRIST WATCH (OCULUS CONTROLS) ---
const leftHand = renderer.xr.getController(0);
playerGroup.add(leftHand);

function createWatch() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128; canvas.height = 64;
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,128,64);
    ctx.fillStyle = '#89CFF0'; ctx.font = '22px Arial';
    ctx.fillText('$5,000', 30, 40);
    const watch = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    watch.rotation.x = -Math.PI/2;
    leftHand.add(watch);
}
createWatch();

// --- 1.7 MOVEMENT ENGINE ---
function handleInput() {
    const session = renderer.xr.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
        if (source.gamepad && source.handedness === 'left') {
            const axes = source.gamepad.axes;
            // Smooth gliding
            playerGroup.position.z += axes[3] * 0.06;
            playerGroup.position.x += axes[2] * 0.06;

            // Auto-Sit logic
            if (playerGroup.position.distanceTo(table.position) < 1.8) {
                playerGroup.position.set(0, 0, -3.2);
            }
        }
    }
}

// --- MAIN LOOP ---
renderer.setAnimationLoop(() => {
    handleInput();
    renderer.render(scene, camera);
});

// Test the win UI
setTimeout(() => { showWinner("YOU WIN THE POT!"); }, 5000);
