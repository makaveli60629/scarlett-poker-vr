import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Controls } from './core/controls.js';
import { World } from './world.js';

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: false }),
    player: new THREE.Group(),
    clock: new THREE.Clock()
};

async function init() {
    // 1. RENDERER SETUP
    S.renderer.setPixelRatio(window.devicePixelRatio);
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.xr.enabled = true;
    // Set a background color so "Black" means "Empty", not "Broken"
    S.scene.background = new THREE.Color(0x050505); 
    document.body.appendChild(S.renderer.domElement);
    document.body.appendChild(VRButton.createButton(S.renderer));

    // 2. RIG SETUP
    S.scene.add(S.player);
    S.player.add(S.camera);
    // Move out of the wall - Spawn in the middle of the lobby
    S.player.position.set(0, 1.6, 10); 

    // 3. GUARANTEED LIGHTING (Fixes black screen)
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    S.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(5, 10, 5);
    S.scene.add(sun);

    // 4. MODULE INITIALIZATION
    Controls.init({ THREE, renderer: S.renderer, camera: S.camera, player: S.player, scene: S.scene });
    await World.init({ THREE, scene: S.scene, player: S.player });

    // 5. THE RE-CENTER BUTTON LOGIC
    document.getElementById('recenterBtn').addEventListener('click', () => {
        S.player.position.set(0, 0, 5); // Jump to front of table
        S.player.lookAt(0, 0, 0);
    });

    // 6. XR SESSION FIX
    S.renderer.xr.addEventListener('sessionstart', () => {
        console.log("VR Started");
        // Force the player to look at the pit table
        setTimeout(() => { S.player.lookAt(0, 0, 0); }, 500);
    });

    S.renderer.setAnimationLoop(tick);
}

function tick() {
    const dt = S.clock.getDelta();
    Controls.update(dt);
    S.renderer.render(S.scene, S.camera);
}

init();
