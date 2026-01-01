import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- SCENE & CAMERA SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue Background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- PLAYER RIG (For Movement) ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup); 
// We move the playerGroup, NOT the camera directly.

// --- FULL STRENGTH LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Strong overall light
scene.add(ambientLight);

const overheadLight = new THREE.PointLight(0xffffff, 2.0);
overheadLight.position.set(0, 5, -2);
scene.add(overheadLight);

// --- UPDATE 1.4 TEXTURE PREP: GEOMETRY ---
const textureLoader = new THREE.TextureLoader();

// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Walls (The Room)
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brick Brown
const wallFront = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMaterial);
wallFront.position.set(0, 5, -10);
scene.add(wallFront);

// The Table (The "Play Game" target)
const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
    new THREE.MeshStandardMaterial({ color: 0x006400 }) // Poker Green
);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- FIXED WALLET (World Space) ---
function createFixedWallet() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#89CFF0'; // Baby Blue
    ctx.font = 'Bold 40px Arial';
    ctx.fillText('WALLET: $5,000', 10, 50);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const walletSprite = new THREE.Sprite(spriteMaterial);
    
    // Position it in the "Zone" (World Space)
    walletSprite.position.set(0, 2, -2); 
    walletSprite.scale.set(2, 1, 1);
    
    scene.add(walletSprite); // Adding to SCENE, not CAMERA
}
createFixedWallet();

// --- MOVEMENT CONTROLS ---
function handleXRInput() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                // Move the whole playerGroup through the room
                playerGroup.position.z += axes[3] * 0.05;
                playerGroup.position.x += axes[2] * 0.05;
                
                // Auto-Sit detection
                const dist = playerGroup.position.distanceTo(new THREE.Vector3(0, 0, -4));
                if (dist < 1.5) {
                    playerGroup.position.set(0, 0, -3.2); // Snap to table
                }
            }
        }
    }
}

renderer.setAnimationLoop(() => {
    handleXRInput();
    renderer.render(scene, camera);
});
