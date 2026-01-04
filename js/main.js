import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.150.1/examples/jsm/webxr/VRButton.js';

import { World } from './world.js';
import { Controls } from './controls.js';
import { Hands } from './hands.js';
import { UI } from './ui.js';

const hud = document.getElementById('hud');
if (hud) hud.textContent = "main.js running…";

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    // Rig
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);
    this.playerGroup.add(this.camera);

    // Spawn: X/Z only (floor height is handled by local-floor)
    this.playerGroup.position.set(0, 0, 10);

    // Build world and register colliders/teleportables
    World.build(this.scene);

    // Input + movement + collision + teleport
    Controls.init(this.renderer, this.scene, this.playerGroup, World.getRuntime());

    // Hands/controllers auto-detect (visuals)
    Hands.init(this.renderer, this.playerGroup);

    // UI (watch + leaderboard)
    UI.init(this.scene, this.playerGroup);

    window.addEventListener('resize', () => this.onResize(), { passive: true });

    if (hud) hud.textContent = "✅ Scene built. Enter VR.";
    this.renderer.setAnimationLoop(() => {
      Hands.update();
      Controls.update();
      UI.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

new Game();
