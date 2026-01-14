import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Controls } from './core/controls.js'; // Using your old code
import { World } from './world.js';

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    player: new THREE.Group(),
    clock: new THREE.Clock()
};

async function init() {
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.xr.enabled = true;
    document.body.appendChild(S.renderer.domElement);
    document.body.appendChild(VRButton.createButton(S.renderer));

    S.scene.add(S.player);
    S.player.add(S.camera);

    // Initial position in the Lobby
    S.player.position.set(10, 0, 10);

    // 1. Initialize YOUR Controls
    Controls.init({
        THREE,
        renderer: S.renderer,
        camera: S.camera,
        player: S.player,
        scene: S.scene
    });

    // 2. Build the World
    await World.init({ 
        THREE, 
        scene: S.scene, 
        renderer: S.renderer, 
        camera: S.camera, 
        player: S.player 
    });

    // 3. THE "VISION FIX"
    S.renderer.xr.addEventListener('sessionstart', () => {
        setTimeout(() => {
            // Force face the center pit (0,0,0)
            S.player.lookAt(0, 0, 0); 
            console.log("Controls: Vision Calibrated");
        }, 1000);
    });

    S.renderer.setAnimationLoop(() => {
        const dt = S.clock.getDelta();
        // Run your update loop for movement/turning
        Controls.update(dt);
        S.renderer.render(S.scene, S.camera);
    });
}

init();
