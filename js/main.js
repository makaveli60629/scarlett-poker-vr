 // /js/main.js — Scarlett VR Poker (FULL FX BUILD)
// Assumes you have Three.js available as module at ./js/three.module.js
// If your project uses a wrapper ./three.js, swap import accordingly.

import * as THREE from './three.module.js';
import { VRButton } from './VRButton.js';
import { createGameFeelFX } from './gameplay_fx.js';
import { createPokerEngine } from './poker_engine.js';

const log = (...a) => console.log('[Scarlett]', ...a);

let scene, camera, renderer;
let table, chairs = [], bots = [];
let FX, Engine;

boot();

function boot() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 200);
  camera.position.set(0, 1.6, 3.1);

  // Lights (casino vibe)
  const hemi = new THREE.HemisphereLight(0x9fb6ff, 0x1a1a24, 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2, 5, 3);
  scene.add(key);

  const rim = new THREE.PointLight(0x7fe7ff, 0.9, 12);
  rim.position.set(-2, 2.2, -2);
  scene.add(rim);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Simple room walls
  addWalls();

  // Poker set
  table = makeTable();
  scene.add(table);

  chairs = makeChairs(8, table.position, 1.4);
  chairs.forEach(c => scene.add(c));

  bots = makeBots(8);
  bots.forEach(b => scene.add(b.mesh));

  // FX pack
  FX = createGameFeelFX({
    THREE, scene, camera, renderer,
    bots, table, chairs,
    hudEl: document.getElementById('hud'),
    log
  });
  FX.init();

  // Poker engine (slow + readable)
  Engine = createPokerEngine({
    bots,
    fx: FX,
    log
  });
  Engine.start(); // endless loop

  // Render loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;

    FX.update(dt);
    renderer.render(scene, camera);
  });

  // Resize
  window.addEventListener('resize', onResize);
  onResize();

  log('Boot complete ✅');
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ------------------------------
// World helpers
// ------------------------------
function addWalls() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1 });
  const wallGeo = new THREE.BoxGeometry(40, 5, 0.4);
  const wall1 = new THREE.Mesh(wallGeo, wallMat);
  wall1.position.set(0, 2.5, -12);
  scene.add(wall1);

  const wall2 = wall1.clone(); wall2.position.set(0, 2.5, 12); scene.add(wall2);

  const wallSideGeo = new THREE.BoxGeometry(0.4, 5, 40);
  const wall3 = new THREE.Mesh(wallSideGeo, wallMat);
  wall3.position.set(-12, 2.5, 0);
  scene.add(wall3);

  const wall4 = wall3.clone(); wall4.position.set(12, 2.5, 0); scene.add(wall4);
}

function makeTable() {
  const group = new THREE.Group();

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.85, 0.8, 32),
    new THREE.MeshStandardMaterial({ color: 0x141621, roughness: 0.9, metalness: 0.1 })
  );
  base.position.y = 0.4;
  group.add(base);

  // Felt top (important)
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0x0e5a3b, roughness: 0.95 })
  );
  felt.position.y = 0.86;
  felt.material.emissive = new THREE.Color(0x000000);
  felt.material.emissiveIntensity = 0.15;
  group.add(felt);

  // Rail ring
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.09, 18, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a1c2a, roughness: 0.55, metalness: 0.15 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.9;
  group.add(rail);

  // Save reference to top felt as "table" material pulsing target
  group.userData.felt = felt;

  group.position.set(0, 0, 0);
  return group;
}

function makeChairs(count, tablePos, radius) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = tablePos.x + Math.cos(a) * radius;
    const z = tablePos.z + Math.sin(a) * radius;

    const chair = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.95 })
    );
    seat.position.y = 0.45;
    chair.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.95 })
    );
    back.position.set(0, 0.72, -0.18);
    chair.add(back);

    // Position chair
    chair.position.set(x, 0, z);

    // KEY: chair faces table center (so bots also face correctly)
    chair.lookAt(tablePos.x, chair.position.y, tablePos.z);

    // If your chair model points the wrong way, uncomment:
    // chair.rotateY(Math.PI);

    out.push(chair);
  }
  return out;
}

function makeBots(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const bot = {
      id: i,
      stack: 1500,
      mesh: makeBotMesh(i)
    };
    out.push(bot);
  }
  return out;
}

function makeBotMesh(i) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.45, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2d3e, roughness: 0.85 })
  );
  body.position.y = 0.9;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x30344a, roughness: 0.6 })
  );
  head.position.y = 1.35;
  group.add(head);

  // Eyes (tiny glow)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), eyeMat);
  const eye2 = eye1.clone();
  eye1.position.set(-0.06, 1.37, 0.12);
  eye2.position.set(0.06, 1.37, 0.12);
  group.add(eye1, eye2);

  group.userData.botIndex = i;
  return group;
}
