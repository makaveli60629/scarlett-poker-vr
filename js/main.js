
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- PLAYER RIG (The thing we move) ---
const playerGroup = new THREE.Group();
scene.add(playerGroup);
playerGroup.add(camera);

// --- LIGHTING ---
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));

// --- FAIL-SAFE ENVIRONMENT ---
const wallMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
const tableMat = new THREE.MeshBasicMaterial({ color: 0x006400 }); // Green

// Wall Positions
const createWall = (x, z, ry) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
    w.position.set(x, 5, z);
    w.rotation.y = ry;
    scene.add(w);
};
createWall(0, -10, 0); createWall(0, 10, Math.PI);
createWall(-10, 0, Math.PI/2); createWall(10, 0, -Math.PI/2);

const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), tableMat);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- CONTROLLER WAKE-UP ---
const controller0 = renderer.xr.getController(0);
const controller1 = renderer.xr.getController(1);
playerGroup.add(controller0);
playerGroup.add(controller1);

// Attach the Watch to the Left Controller (usually index 0 or 1)
function addWatch(target) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128; canvas.height = 64;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,128,64);
    ctx.fillStyle = '#89CFF0'; ctx.font = '20px Arial';
    ctx.fillText('$5,000', 30, 40);
    const watch = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    watch.rotation.x = -Math.PI / 2;
    target.add(watch);
}

controller0.addEventListener('connected', (e) => {
    if (e.data.handedness === 'left') addWatch(controller0);
});
controller1.addEventListener('connected', (e) => {
    if (e.data.handedness === 'left') addWatch(controller1);
});

// --- MOVEMENT ENGINE ---
function handleMovement() {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (source.gamepad && source.handedness === 'left') {
            const axes = source.gamepad.axes;
            
            // Standard Oculus Thumbstick Mapping: 
            // Axis 2 = Left/Right, Axis 3 = Forward/Back
            const speed = 0.05;
            
            // Forward/Back
            playerGroup.position.z += axes[3] * speed;
            // Left/Right
            playerGroup.position.x += axes[2] * speed;
            
            // Auto-Sit logic
            if (playerGroup.position.distanceTo(table.position) < 1.8) {
                playerGroup.position.set(0, 0, -3.2); // Seat position
            }
        }
    }
}

renderer.setAnimationLoop(() => {
    handleMovement();
    renderer.render(scene, camera);
});
