import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- STABILITY CONFIG ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
// Reset camera to a safe "starting" position so you aren't inside a wall
camera.position.set(0, 1.6, 3); 

const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance" 
});

// CRITICAL: This line prevents the "frozen blue screen" on Oculus
renderer.getContext().makeXRCompatible?.(); 

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- PLAYER RIG ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

// --- LIGHTING ---
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

// --- ENVIRONMENT ---
const wallMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const tableMat = new THREE.MeshBasicMaterial({ color: 0x006400 });

// Walls
const wallGeo = new THREE.PlaneGeometry(20, 10);
[[0, -10, 0], [0, 10, Math.PI], [-10, 0, Math.PI/2], [10, 0, -Math.PI/2]].forEach(p => {
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(p[0], 5, p[1]);
    w.rotation.y = p[2];
    scene.add(w);
});

// Table
const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), tableMat);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- MOVEMENT ENGINE ---
function update() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                // Move based on stick input
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
