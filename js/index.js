import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Controls } from './core/controls.js';
import { World } from './js/world.js';

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }),
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

    // Initial positioning
    S.player.position.set(0, 0, 8);

    // Initialize Modules
    Controls.init({ THREE, renderer: S.renderer, camera: S.camera, player: S.player, scene: S.scene });
    await World.init({ THREE, scene: S.scene });

    // FORCE FACE TABLE ON START
    S.renderer.xr.addEventListener('sessionstart', () => {
        S.player.position.set(0, 0, 8);
        S.player.rotation.set(0, Math.PI, 0); // Forces 180 degree flip to face center
    });

    S.renderer.setAnimationLoop(() => {
        const dt = S.clock.getDelta();
        Controls.update(dt);
        S.renderer.render(S.scene, S.camera);
    });
}

init();
