import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue Fallback

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- LIGHTING ---
const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

// --- TEXTURE REPOSITORY (FROM YOUR LIST) ---
const texLoader = new THREE.TextureLoader();
const textures = {
    brick: texLoader.load('assets/textures/brickwall.jpg'),
    felt: texLoader.load('assets/textures/table_felt_green.jpg'),
    crown: texLoader.load('assets/textures/Crown.jpg'),
    logo: texLoader.load('assets/textures/brand_logo.jpg')
};

// --- ENVIRONMENT BUILDER ---
// 4 Walls
const wallGeo = new THREE.PlaneGeometry(20, 10);
const wallMat = new THREE.MeshStandardMaterial({ map: textures.brick });

for(let i=0; i<4; i++) {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 5;
    if(i === 0) wall.position.z = -10;
    if(i === 1) { wall.position.z = 10; wall.rotation.y = Math.PI; }
    if(i === 2) { wall.position.x = -10; wall.rotation.y = Math.PI / 2; }
    if(i === 3) { wall.position.x = 10; wall.rotation.y = -Math.PI / 2; }
    scene.add(wall);
}

// Table
const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
    new THREE.MeshStandardMaterial({ map: textures.felt })
);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- PLAYER RIG & WATCH (OCULUS CONTROLS) ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

const leftHand = renderer.xr.getController(0);
scene.add(leftHand);

// The Wrist Watch (Wallet)
function createWatch() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 128;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,128);
    ctx.fillStyle = '#89CFF0'; ctx.font = 'Bold 40px Arial';
    ctx.fillText('$5,000', 50, 80);
    
    const watchSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas) 
    }));
    watchSprite.scale.set(0.15, 0.08, 1);
    leftHand.add(watchSprite);
}
createWatch();

// --- MOVEMENT & AUTO-SIT LOGIC ---
renderer.setAnimationLoop(() => {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                playerGroup.position.z += axes[3] * 0.05;
                playerGroup.position.x += axes[2] * 0.05;
                
                // Auto-Sit trigger
                if (playerGroup.position.distanceTo(table.position) < 2) {
                    playerGroup.position.set(0, 0, -3.2); // Snaps you to seat
                }
            }
        }
    }
    renderer.render(scene, camera);
});
