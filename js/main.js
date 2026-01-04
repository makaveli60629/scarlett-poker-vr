import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.150.1/examples/jsm/webxr/VRButton.js';

import { World } from './world.js';
import { Controls } from './controls.js';

let scene, camera, renderer, player;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  player = new THREE.Group();
  scene.add(player);
  player.add(camera);

  // Correct VR spawn height (prevents floating / black screen)
  player.position.set(0, 0, 6);

  World.build(scene);
  Controls.init(renderer, scene, player);

  renderer.setAnimationLoop(render);
}

function render() {
  Controls.update();
  renderer.render(scene, camera);
}
