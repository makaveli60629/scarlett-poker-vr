import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- INITIALIZE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Force Sky Blue background

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB, 1); // Extra insurance against black screen
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- LIGHTING ---
const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
scene.add(light);

// --- FAIL-SAFE MATERIALS ---
// These will show GREEN and BROWN immediately even if textures fail
const wallMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown fallback
const tableMat = new THREE.MeshBasicMaterial({ color: 0x006400 }); // Green fallback

// --- ASSET LOADING ---
const loader = new THREE.TextureLoader();
// Try to load textures, apply them ONLY when they finish
loader.load('assets/texture/brick.jpg', (tex) => {
    wallMat.map = tex;
    wallMat.needsUpdate = true;
});
loader.load('assets/texture/felt.jpg', (tex) => {
    tableMat.map = tex;
    tableMat.needsUpdate = true;
});

// --- THE ROOM ---
// 4 Walls
const wallGeo = new THREE.PlaneGeometry(20, 10);
const wallPositions = [
    { pos: [0, 5, -10], rot: [0, 0, 0] },
    { pos: [0, 5, 10], rot: [0, Math.PI, 0] },
    { pos: [-10, 5, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [10, 5, 0], rot: [0, -Math.PI / 2, 0] }
];

wallPositions.forEach(w => {
    const mesh = new THREE.Mesh(wallGeo, wallMat);
    mesh.position.set(...w.pos);
    mesh.rotation.set(...w.rot);
    scene.add(mesh);
});

// The Table
const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), tableMat);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- PLAYER & WATCH ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

const leftController = renderer.xr.getController(0);
scene.add(leftController);

// Wallet on the Watch
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 128; canvas.height = 64;
ctx.fillStyle = '#000'; ctx.fillRect(0,0,128,64);
ctx.fillStyle = '#89CFF0'; ctx.font = '20px Arial';
ctx.fillText('$5,000', 30, 40);
const watchSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
watchSprite.scale.set(0.1, 0.05, 1);
leftController.add(watchSprite);

// --- RENDER LOOP ---
function animate() {
    renderer.setAnimationLoop(() => {
        const session = renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    playerGroup.position.z += axes[3] * 0.04;
                    playerGroup.position.x += axes[2] * 0.04;
                }
            }
        }
        renderer.render(scene, camera);
    });
}
animate();
