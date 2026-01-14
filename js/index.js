import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => { document.getElementById('hudlog').innerHTML += `<div>> ${m}</div>`; };

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: false }),
    player: new THREE.Group(),
    clock: new THREE.Clock()
};

async function boot() {
    // 1. Setup Renderer & Quest Fix
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.xr.enabled = true;
    document.getElementById('app').appendChild(S.renderer.domElement);
    document.body.appendChild(VRButton.createButton(S.renderer));
    document.getElementById('l-render').classList.add('on');

    S.player.add(S.camera);
    S.scene.add(S.player);

    // 2. Load Modules & Diagnostics
    try {
        const { World } = await import("./js/world.js");
        await World.init({ THREE, scene: S.scene, renderer: S.renderer, player: S.player });
        document.getElementById('l-world').classList.add('on');
        log("World Module Attached");
    } catch(e) { log("World Error: " + e.message); }

    // 3. Android Detection & Movement
    if (/Android|iPhone/i.test(navigator.userAgent)) {
        document.querySelectorAll('.joy-zone').forEach(el => el.style.display = 'block');
        document.getElementById('l-input').classList.add('on');
        log("Android Touch Ready");
    }

    // 4. Hide HUD Logic
    document.getElementById('hide-btn').onclick = () => {
        document.getElementById('hud').style.opacity = '0';
        document.getElementById('hud').style.pointerEvents = 'none';
    };

    // 5. Quest VR Start Fix (Force 180 and clean UI)
    S.renderer.xr.addEventListener('sessionstart', () => {
        document.getElementById('hud').style.display = 'none';
        S.player.rotation.set(0, Math.PI, 0); // Face the table
        log("VR Active - Rig Calibrated");
    });

    S.renderer.setAnimationLoop(() => {
        S.renderer.render(S.scene, S.camera);
    });
}

boot();
