import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Controls } from './core/controls.js';
import { World } from './world.js';

const S = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance" // Critical for Quest
    }),
    player: new THREE.Group(),
    clock: new THREE.Clock()
};

async function init() {
    S.renderer.setPixelRatio(window.devicePixelRatio);
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.xr.enabled = true;
    
    // Set a clear background so you know it's working (Dark Blue)
    S.scene.background = new THREE.Color(0x050510); 
    document.body.appendChild(S.renderer.domElement);
    
    // Add the button
    const vrButton = VRButton.createButton(S.renderer);
    document.body.appendChild(vrButton);

    S.scene.add(S.player);
    S.player.add(S.camera);

    // Initial Position (Start high so you aren't in the floor)
    S.player.position.set(0, 1.6, 5);

    // 1. ADD LIGHTS IMMEDIATELY (Don't wait for modules)
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    S.scene.add(ambient);

    // 2. Initialize your specific core controls
    try {
        Controls.init({ THREE, renderer: S.renderer, camera: S.camera, player: S.player, scene: S.scene });
    } catch (e) { console.error("Controls failed:", e); }

    // 3. START THE LOOP IMMEDIATELY
    // If the loop doesn't start, the Oculus loading screen never ends.
    S.renderer.setAnimationLoop(tick);

    // 4. Load the World afterward
    await World.init({ THREE, scene: S.scene, player: S.player });
}

function tick() {
    const dt = S.clock.getDelta();
    
    // Ensure your original control logic is updating movement/turning
    if (Controls && Controls.update) {
        Controls.update(dt);
    }

    // MANDATORY: Render every single frame
    S.renderer.render(S.scene, S.camera);
}

init();
