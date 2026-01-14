import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import Controls from '../core/controls.js';
import { World } from './world.js';

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    player: new THREE.Group(), // Your "Rig"
    clock: new THREE.Clock()
};

async function init() {
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.xr.enabled = true;
    document.body.appendChild(S.renderer.domElement);
    document.body.appendChild(VRButton.createButton(S.renderer));

    S.scene.add(S.player);
    S.player.add(S.camera);

    // Initial Position (In the VIP Room)
    S.player.position.set(14, 0, 6);

    // Initialize Modules
    const controls = new Controls(S);
    await World.init(S);

    // VISION FIX: Turn 180 on start
    S.renderer.xr.addEventListener('sessionstart', () => {
        setTimeout(() => {
            S.player.lookAt(0, 0, 0); // Face the center pit
        }, 1000);
    });

    S.renderer.setAnimationLoop(() => {
        const dt = S.clock.getDelta();
        controls.update(dt);
        S.renderer.render(S.scene, S.camera);
    });
}

init();
