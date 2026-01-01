import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- 1. CORE ENGINE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // The Sky

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- 2. LIGHTING ---
const ambient = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 5);
scene.add(sun);

// --- 3. THE 4 BRICK WALLS ---
const texLoader = new THREE.TextureLoader();
// Using your assets/texture/ folder
const brickTex = texLoader.load('assets/texture/brick.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
});

const wallMat = new THREE.MeshStandardMaterial({ 
    map: brickTex, 
    color: 0x8B4513 // Fallback brown if texture fails
});

const wallGeo = new THREE.PlaneGeometry(20, 10);

const createWall = (x, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, 5, z);
    wall.rotation.y = ry;
    scene.add(wall);
};

// Placing the 4 walls
createWall(0, -10, 0);          // Back
createWall(0, 10, Math.PI);     // Front
createWall(-10, 0, Math.PI / 2); // Left
createWall(10, 0, -Math.PI / 2);// Right

// --- 4. PLAYER RIG & HIDDEN LOGICS ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

// Wrist Watch (Wallet) Placeholder - ready for when we activate it
const leftController = renderer.xr.getController(0);
playerGroup.add(leftController);

// --- 5. OCULUS CONTROLS (Movement Logic preserved) ---
function handleMovement() {
    const session = renderer.xr.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
        if (source.gamepad && source.handedness === 'left') {
            const axes = source.gamepad.axes;
            playerGroup.position.z += axes[3] * 0.05;
            playerGroup.position.x += axes[2] * 0.05;
        }
    }
}

// --- 6. RENDER LOOP ---
renderer.setAnimationLoop(() => {
    handleMovement();
    renderer.render(scene, camera);
});
