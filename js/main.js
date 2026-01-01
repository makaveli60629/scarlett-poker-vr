import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue (Ceiling is missing/open)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- LIGHTING (CRITICAL) ---
const ambient = new THREE.AmbientLight(0xffffff, 1.5); // Brightest setting
scene.add(ambient);

// --- TEXTURE LOADER ---
const texLoader = new THREE.TextureLoader();
const brickTex = texLoader.load('assets/texture/brick.jpg');
const feltTex = texLoader.load('assets/texture/felt.jpg');

// --- THE ROOM (4 WALLS + TABLE) ---
const wallGeo = new THREE.PlaneGeometry(20, 10);
const wallMat = new THREE.MeshStandardMaterial({ map: brickTex, color: 0x8B4513 });

// Back Wall
const wall1 = new THREE.Mesh(wallGeo, wallMat);
wall1.position.set(0, 5, -10);
scene.add(wall1);

// Front Wall
const wall2 = new THREE.Mesh(wallGeo, wallMat);
wall2.position.set(0, 5, 10);
wall2.rotation.y = Math.PI;
scene.add(wall2);

// Left Wall
const wall3 = new THREE.Mesh(wallGeo, wallMat);
wall3.position.set(-10, 5, 0);
wall3.rotation.y = Math.PI / 2;
scene.add(wall3);

// Right Wall
const wall4 = new THREE.Mesh(wallGeo, wallMat);
wall4.position.set(10, 5, 0);
wall4.rotation.y = -Math.PI / 2;
scene.add(wall4);

// The Poker Table
const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
    new THREE.MeshStandardMaterial({ map: feltTex, color: 0x004d00 })
);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- PLAYER & WATCH HUD ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

// Create the Watch on the Left Controller
const leftController = renderer.xr.getController(0);
scene.add(leftController);

function createWatch() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 128;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#89CFF0'; // Baby Blue
    ctx.font = 'Bold 50px Arial';
    ctx.fillText('$5,000', 45, 85);

    const watchTex = new THREE.CanvasTexture(canvas);
    const watchSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: watchTex }));
    watchSprite.scale.set(0.15, 0.07, 1);
    watchSprite.position.set(0, 0.03, 0); 
    leftController.add(watchSprite);
}
createWatch();

// --- MOVEMENT LOOP ---
renderer.setAnimationLoop(() => {
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
    renderer.render(scene, camera);
});
