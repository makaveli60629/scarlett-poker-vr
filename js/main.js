import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue default background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- FULL ROOM LIGHTING ---
// This ensures you are NEVER in the dark again
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Bright global light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Mimics sunlight from sky
sunLight.position.set(5, 10, 5);
scene.add(sunLight);

// --- ROOM GEOMETRY (The 4 Walls & Floor) ---
const textureLoader = new THREE.TextureLoader();

// Floor (Dark Grey/Carpet)
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Walls (Brick Logic)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Temporary Brick Brown
const createWall = (width, height, x, y, z, rotationY) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = rotationY;
    scene.add(wall);
};

createWall(20, 10, 0, 5, -10, 0);          // Back Wall
createWall(20, 10, 0, 5, 10, Math.PI);    // Front Wall
createWall(20, 10, -10, 5, 0, Math.PI / 2); // Left Wall
createWall(20, 10, 10, 5, 0, -Math.PI / 2); // Right Wall

// Ceiling (Sky)
const skyGeo = new THREE.PlaneGeometry(20, 20);
const skyMat = new THREE.MeshStandardMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.rotation.x = Math.PI / 2;
sky.position.y = 10;
scene.add(sky);

// --- THE POKER TABLE ---
const tableGroup = new THREE.Group();
const tableTopGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Classic Poker Green
const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
tableTop.position.y = 0.8;

const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
tableLeg.position.y = 0.4;

tableGroup.add(tableTop, tableLeg);
tableGroup.position.set(0, 0, -4); // Table in front of start
scene.add(tableGroup);

// --- WALLET HOLOGRAM (Zone Room) ---
function createWallet() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#89CFF0'; // Baby Blue
    ctx.font = 'Bold 40px Arial';
    ctx.fillText('WALLET: $5,000', 10, 50);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sprite.position.set(0, 2.2, -2); // Floating near entrance
    sprite.scale.set(2, 1, 1);
    scene.add(sprite);
}
createWallet();

// --- OCULUS MOVEMENT LOGIC ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

function handleMovement() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                // Move player relative to camera direction
                playerGroup.position.z += axes[3] * 0.05;
                playerGroup.position.x += axes[2] * 0.05;

                // Auto-Sit Logic
                if (playerGroup.position.distanceTo(tableGroup.position) < 2) {
                    playerGroup.position.set(0, 0, -3.2); // Snap to seat
                }
            }
        }
    }
}

renderer.setAnimationLoop(() => {
    handleMovement();
    renderer.render(scene, camera);
});
