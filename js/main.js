// /js/main.js — App entry (renderer + XR)

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

export async function start(ctx) {
  const { BOOT_VERSION, sessionInit, Diagnostics } = ctx;

  Diagnostics.ok('boot');

  const app = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3.2);

  const player = new THREE.Group();
  player.add(camera);
  scene.add(player);

  // Basic lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 8, 5);
  scene.add(dir);

  // XR button
  try {
    const btn = VRButton.createButton(renderer, sessionInit);
    document.body.appendChild(btn);
    Diagnostics.ok('VRButton');
  } catch (e) {
    Diagnostics.fail('VRButton', e);
  }

  // Safe-load the rest of the modules
  const safe = async (label, path) => {
    try {
      Diagnostics.log('Import', `${label}: ${path}`);
      const mod = await import(path + `?v=${BOOT_VERSION}`);
      Diagnostics.ok(label);
      return mod;
    } catch (err) {
      Diagnostics.fail(label, err);
      return null;
    }
  };

  const worldM = await safe('world', './world.js');
  const tableM = await safe('table', './table.js');
  const chairM = await safe('chair', './chair.js');
  const uiM = await safe('ui', './ui.js');
  const controlsM = await safe('controls', './controls.js');
  const teleportM = await safe('teleport', './teleport.js');
  const interactionsM = await safe('interactions', './interactions.js');

  // Build world
  const world = worldM?.createWorld ? worldM.createWorld({ THREE, scene, Diagnostics }) : null;
  const table = tableM?.createTable ? tableM.createTable({ THREE, scene, Diagnostics }) : null;
  const chairs = chairM?.createChairs ? chairM.createChairs({ THREE, scene, Diagnostics }) : [];

  const ui = uiM?.createUI ? uiM.createUI({ THREE, scene, camera, Diagnostics }) : null;

  // Controls + teleport + interactions
  const controls = controlsM?.createControls ? controlsM.createControls({ THREE, renderer, scene, player, camera, Diagnostics }) : null;
  const teleport = teleportM?.createTeleport ? teleportM.createTeleport({ THREE, renderer, scene, player, camera, Diagnostics }) : null;
  const interactions = interactionsM?.createInteractions ? interactionsM.createInteractions({ THREE, renderer, scene, camera, Diagnostics }) : null;

  // Spawn safely (never inside table)
  safeSpawn(player, Diagnostics);

  // Resize handling
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  Diagnostics.kv('app.version', String(BOOT_VERSION));
  Diagnostics.kv('three', THREE.REVISION);

  // Main loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    // update modules (if present)
    world?.update?.(dt);
    table?.update?.(dt);
    chairs?.forEach(c => c?.update?.(dt));

    controls?.update?.(dt);

    // feed controls into teleport + interactions
    const rays = controls?.getRays?.() || {};
    const buttons = controls?.getButtons?.() || {};
    Diagnostics.setButtons(buttons);

    ui?.update?.(dt, { buttons });

    teleport?.update?.(dt, { rays, buttons, floor: world?.floorMesh });
    interactions?.update?.(dt, { rays, buttons, targets: ui?.targets || [] });

    renderer.render(scene, camera);
  });
}

function safeSpawn(player, Diagnostics) {
  // Behind the table, human height, facing toward origin.
  player.position.set(0, 0, 3.2);
  player.rotation.set(0, 0, 0);
  Diagnostics.kv('spawn', JSON.stringify({ x:0, y:0, z:3.2 }));
}
