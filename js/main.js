import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

// --- FAIL-SAFE TEXTURE LOADING ---
const texLoader = new THREE.TextureLoader();

const loadTexture = (path, fallbackColor) => {
    return texLoader.load(
        path, 
        (texture) => { console.log(`Loaded: ${path}`); },
        undefined, 
        (err) => { 
            console.warn(`Error loading ${path}, using color ${fallbackColor}`);
        }
    );
};

// Update 1.4 Textures from your folder
const brickTex = loadTexture('assets/texture/brick.jpg', '#8B4513');
const feltTex = loadTexture('assets/texture/felt.jpg', '#004d00');

brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
brickTex.repeat.set(4, 2);

// --- THE ROOM ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Bricked Walls (Will show brick.jpg or solid brown if file missing)
const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 10),
    new THREE.MeshStandardMaterial({ map: brickTex, color: 0x8B4513 }) 
);
backWall.position.set(0, 5, -10);
scene.add(backWall);

// The Table (Will show felt.jpg or solid green if file missing)
const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
    new THREE.MeshStandardMaterial({ map: feltTex, color: 0x004d00 })
);
table.position.set(0, 0.8, -4);
scene.add(table);

// --- PLAYER & WATCH ---
const playerGroup = new THREE.Group();
playerGroup.add(camera);
scene.add(playerGroup);

const leftController = renderer.xr.getController(0);
scene.add(leftController);

function createWatch() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 128;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#89CFF0'; // Baby Blue
    ctx.font = 'Bold 40px Arial';
    ctx.fillText('$5,000', 60, 80);

    const watchTex = new THREE.CanvasTexture(canvas);
    const watchSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: watchTex }));
    watchSprite.scale.set(0.15, 0.08, 1);
    leftController.add(watchSprite);
}
createWatch();

// --- ANIMATION LOOP ---
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
