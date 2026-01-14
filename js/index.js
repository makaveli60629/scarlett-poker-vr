import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Controls } from './core/controls.js';
import { World } from './js/world.js';

const logWin = document.getElementById('log-window');
function diagLog(msg) {
    logWin.innerHTML += `<div>> ${msg}</div>`;
    logWin.scrollTop = logWin.scrollHeight;
}

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: true }),
    player: new THREE.Group(),
    clock: new THREE.Clock()
};

async function boot() {
    try {
        // Check THREE
        document.getElementById('lamp-three').classList.add('on');
        diagLog("THREE.js Render Engine Active");

        S.renderer.setSize(window.innerWidth, window.innerHeight);
        S.renderer.xr.enabled = true;
        document.body.appendChild(S.renderer.domElement);
        document.body.appendChild(VRButton.createButton(S.renderer));

        S.scene.add(S.player);
        S.player.add(S.camera);

        // Load World
        await World.init({ THREE, scene: S.scene });
        document.getElementById('lamp-world').classList.add('on');
        diagLog("World Module: Loaded Table & Bots");

        // Load Controls
        Controls.init({ renderer: S.renderer, camera: S.camera, player: S.player, scene: S.scene });
        document.getElementById('lamp-controls').classList.add('on');
        diagLog("VR Controls: Calibrated (V18 Logic)");

        // Detect Android
        if (/Android|iPhone/i.test(navigator.userAgent)) {
            document.getElementById('lamp-android').classList.add('on');
            document.getElementById('left-stick').style.display = 'block';
            document.getElementById('right-stick').style.display = 'block';
            diagLog("Android Detected: Enabling Touch Debugger");
        }

        // 180 Flip on VR Start
        S.renderer.xr.addEventListener('sessionstart', () => {
            document.getElementById('diag-hud').style.display = 'none';
            S.player.position.set(0, 0, 8);
            S.player.rotation.set(0, Math.PI, 0); 
            diagLog("XR Session Active: Rig Flipped 180°");
        });

        S.renderer.setAnimationLoop(() => {
            const dt = S.clock.getDelta();
            const t = S.clock.getElapsedTime();
            Controls.update(dt);
            if (World.update) World.update(dt, t);
            S.renderer.render(S.scene, S.camera);
        });

    } catch (err) {
        diagLog(`CRITICAL ERROR: ${err.message}`);
        const lamp = document.querySelector('.lamp:not(.on)');
        if (lamp) lamp.classList.add('err');
    }
}

boot();
