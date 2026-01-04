import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.150.1/examples/jsm/webxr/VRButton.js';

import { World } from './world.js';
import { Controls } from './controls.js';

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.player = new THREE.Group();
    this.scene.add(this.player);
    this.player.add(this.camera);

    // correct VR height
    this.player.position.set(0, 0, 10);

    World.build(this.scene);
    Controls.init(this.renderer, this.scene, this.player);

    this.renderer.setAnimationLoop(() => {
      Controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
}

new Game();
