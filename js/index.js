import * as THREE from "./three.js";
import { Controls } from "./core/controls.js";
import { World } from "./world.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

// INIT CONTROLS FIRST
Controls.init({
  THREE,
  renderer,
  scene,
  camera,
  player,
  log: console.log
});

// INIT WORLD SECOND
const world = await World.init({
  THREE,
  scene,
  renderer,
  camera,
  player,
  log: console.log
});

renderer.setAnimationLoop((t) => {
  const dt = Math.min(0.05, renderer.clock?.getDelta?.() || 0.016);
  Controls.update(dt);
  world?.tick?.(dt, t);
  renderer.render(scene, camera);
});
