import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const vLog = (m) => { document.getElementById('v-log').innerText = m; console.log(m); };

// 1. Initial State
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

// 2. The Rig (Crucial for 180 flip)
const player = new THREE.Group();
player.add(camera);
scene.add(player);

const clock = new THREE.Clock();
const moveState = { fwd: 0, side: 0, turn: 0 };

async function boot() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.getElementById('app').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));
    document.getElementById('l1').classList.add('active');

    // Load World Module
    try {
        const { World } = await import("./js/world.js");
        await World.init({ THREE, scene, renderer });
        document.getElementById('l2').classList.add('active');
        vLog("WORLD_READY");
    } catch (e) { vLog("WORLD_ERR: " + e.message); }

    // Android Movement Logic
    setupAndroidMove();

    // The Fix: Auto-Flip and Hide HUD
    renderer.xr.addEventListener('sessionstart', () => {
        // Remove the HUD from face
        document.getElementById('ghost-diag').style.display = 'none';
        document.getElementById('joy-left').style.display = 'none';
        document.getElementById('joy-right').style.display = 'none';
        
        // Force 180 Turn (Face the table immediately)
        player.position.set(0, 0, 8);
        player.rotation.set(0, Math.PI, 0); 
    });

    renderer.setAnimationLoop(() => {
        const dt = clock.getDelta();
        
        // Apply Android Movement
        if (moveState.fwd !== 0 || moveState.side !== 0) {
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            dir.y = 0; dir.normalize();
            const side = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            side.y = 0; side.normalize();
            
            player.position.addScaledVector(dir, -moveState.fwd * 4 * dt);
            player.position.addScaledVector(side, moveState.side * 4 * dt);
        }
        player.rotation.y -= moveState.turn * 2 * dt;

        renderer.render(scene, camera);
    });
}

function setupAndroidMove() {
    const handle = (id, cb) => {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', (e) => e.preventDefault());
        el.addEventListener('touchmove', (e) => {
            const r = el.getBoundingClientRect();
            const t = e.targetTouches[0];
            cb((t.clientX - r.left - 70)/70, (t.clientY - r.top - 70)/70);
        });
        el.addEventListener('touchend', () => cb(0, 0));
    };

    handle('joy-left', (x, y) => { moveState.side = x; moveState.fwd = y; });
    handle('joy-right', (x, y) => { moveState.turn = x; });
    document.getElementById('l3').classList.add('active');
}

boot();
