import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- INITIALIZE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- PLAYER RIG (Your Logic) ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

// --- LIGHTING ---
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
scene.add(light);

// --- THE 4 WALLS (No Table Yet) ---
// Using Basic Material so it cannot crash the renderer
const wallMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Fallback Brown

// Texture Injection Logic
const loader = new THREE.TextureLoader();
loader.load('assets/texture/brick.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    wallMat.map = tex;
    wallMat.needsUpdate = true;
});

const wallGeo = new THREE.PlaneGeometry(20, 10);
const createWall = (x, z, ry) => {
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(x, 5, z);
    w.rotation.y = ry;
    scene.add(w);
};

// Layout: 4 Walls
createWall(0, -10, 0);          // Back
createWall(0, 10, Math.PI);     // Front
createWall(-10, 0, Math.PI/2);  // Left
createWall(10, 0, -Math.PI/2); // Right

// --- WATCH LOGIC (Saved for next step) ---
const leftController = renderer.xr.getController(0);
playerGroup.add(leftController);

// --- MOVEMENT LOOP ---
function update() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                // Move based on stick input (X: Axis 2, Y: Axis 3)
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
