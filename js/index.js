import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./js/world.js";

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: false }),
    player: new THREE.Group(),
    clock: new THREE.Clock()
};

async function boot() {
    // Renderer Prep
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.xr.enabled = true;
    document.getElementById('app').appendChild(S.renderer.domElement);
    
    // Diagnostic Check
    const lWorld = document.getElementById('l-world');
    const lRender = document.getElementById('l-render');

    try {
        await World.init({ scene: S.scene });
        lWorld.classList.add('on');
        lRender.classList.add('on');
    } catch (e) {
        console.error(e);
        lWorld.classList.add('err');
    }

    // Attach VR Button
    const vrBtn = VRButton.createButton(S.renderer);
    document.body.appendChild(vrBtn);

    // Initial Rig Positioning
    S.player.add(S.camera);
    S.scene.add(S.player);
    S.player.position.set(0, 0, 8); // Start outside the pit

    // 180° Flip for Quest
    S.renderer.xr.addEventListener('sessionstart', () => {
        S.player.rotation.set(0, Math.PI, 0); // Corrects orientation
        document.getElementById('hud').style.display = 'none'; // Clear the face
    });

    // Android Movement Mapping
    setupAndroidControls();

    S.renderer.setAnimationLoop(() => {
        S.renderer.render(S.scene, S.camera);
    });
}

function setupAndroidControls() {
    // Your joystick logic from the previous turn goes here
    // It maps to S.player.position and S.player.rotation.y
}

boot();
