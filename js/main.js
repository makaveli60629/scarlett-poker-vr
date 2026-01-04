import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';
import { Controls } from './controls.js';

const hud = document.getElementById('hud');

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);
    this.playerGroup.add(this.camera);

    // Safe spawn: slightly above floor, facing table area
    this.playerGroup.position.set(0, 1.6, 8);

    World.build(this.scene);                // world + table baseline
    Controls.init(this.renderer, this.scene, this.playerGroup);

    window.addEventListener('resize', () => this.onResize());

    hud.textContent = "Running ✅ If you see nothing, read HUD error above.";
    this.renderer.setAnimationLoop(() => {
      Controls.update();
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
