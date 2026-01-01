import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// --- INITIALIZE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue - IF YOU SEE THIS, THE CODE IS WORKING

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- LIGHTING ---
const ambient = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 5);
scene.add(sun);

// --- ASSETS & TEXTURES ---
const texLoader = new THREE.TextureLoader();
// We use 'color' as a fallback so if the map fails, it isn't black.
const brickMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); 
const feltMat = new THREE.MeshLambertMaterial({ color: 0x006400 });

texLoader.load('assets/texture/brick.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    brickMat.map = tex;
    brickMat.needsUpdate = true;
});

texLoader.load('assets/texture/felt.jpg', (tex) => {
    feltMat.map = tex;
    feltMat.needsUpdate = true;
});

// --- GEOMETRY ---
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({color: 0x222222}));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), brickMat);
backWall.position.set(0, 5, -10);
scene.add(backWall);

const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), feltMat);
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
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#89CFF0'; // Baby Blue
    ctx.font = 'Bold 40px Arial';
    ctx.fillText('$5,000', 50, 80);

    const watchTex = new THREE.CanvasTexture(canvas);
    const watchSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: watchTex }));
    watchSprite.scale.set(0.15, 0.07, 1);
    watchSprite.position.set(0, 0.03, 0);
    leftController.add(watchSprite);
}
createWatch();

// --- GAME LOOP ---
function update() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                // Movement: Thumbstick
                playerGroup.position.z += axes[3] * 0.05;
                playerGroup.position.x += axes[2] * 0.05;

                // Auto-Sit
                if (playerGroup.position.distanceTo(new THREE.Vector3(0,0,-4)) < 1.6) {
                    playerGroup.position.set(0, 0, -3.2);
                }
            }
        }
    }
}

renderer.setAnimationLoop(() => {
    update();
    renderer.render(scene, camera);
});
