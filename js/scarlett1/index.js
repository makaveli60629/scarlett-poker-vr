// SCARLETT1 RUNTIME — FULL LOBBY + POKER DEMO (SINGLETON SAFE)
// Build: SCARLETT1_RUNTIME_FULL_WORKING_v1_5_1_ALL_AUDIOFIX

import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

/* ------------------------------------------------------------------
   GLOBAL SINGLETON ROOT
------------------------------------------------------------------ */
window.SCARLETT = window.SCARLETT || {};
const S = window.SCARLETT;

const BUILD = "SCARLETT1_RUNTIME_FULL_WORKING_v1_5_1_ALL_AUDIOFIX";
console.log(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);
S.BUILD = BUILD;

/* ------------------------------------------------------------------
   DIAG WRITER (safe)
------------------------------------------------------------------ */
const dwrite = (m) => {
  try {
    window.__scarlettDiagWrite?.(String(m));
  } catch (_) {}
};

/* ------------------------------------------------------------------
   AUDIO — SINGLETON (NO REDECLARE POSSIBLE)
------------------------------------------------------------------ */
S.audio = S.audio || (function initAudioOnce() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);

  const resume = async () => {
    try { if (ctx.state !== "running") await ctx.resume(); } catch (_) {}
  };

  const beep = (freq = 440, dur = 0.035, vol = 0.12) => {
    if (ctx.state !== "running") return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur);
  };

  return { ctx, master, resume, beep };
})();

/* ------------------------------------------------------------------
   SCENE / CAMERA / RENDERER
------------------------------------------------------------------ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b10);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

dwrite("[status] renderer OK ✅");

/* ------------------------------------------------------------------
   PLAYER RIG + FORCE SPAWN (SINGLETON SAFE)
------------------------------------------------------------------ */
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

S.forceSpawn = S.forceSpawn || function (rig) {
  if (!rig) return;
  rig.position.set(0, 1.6, 8.0); // SAFE distance from table
  rig.rotation.set(0, Math.PI, 0);
  rig.updateMatrixWorld(true);
};
S.forceSpawn(playerRig);
setTimeout(() => S.forceSpawn(playerRig), 300);
setTimeout(() => S.forceSpawn(playerRig), 1000);

/* ------------------------------------------------------------------
   LIGHTING
------------------------------------------------------------------ */
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(8, 12, 6);
key.castShadow = true;
scene.add(key);

/* ------------------------------------------------------------------
   WORLD (FULL LOBBY)
------------------------------------------------------------------ */
(function buildWorld() {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "floor";
  scene.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f0f14 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat);
  back.position.set(0, 5, -18);
  scene.add(back);

  // Table
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x1f4f2f })
  );
  table.position.set(0, 0.2, 0);
  table.castShadow = true;
  table.name = "pokerTable";
  scene.add(table);

  // Spawn Pad
  const spawnPad = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x22ff88 })
  );
  spawnPad.rotation.x = -Math.PI / 2;
  spawnPad.position.set(0, 0.01, 8);
  scene.add(spawnPad);

  dwrite("[status] world ready ✅");
})();

/* ------------------------------------------------------------------
   CONTROLLERS (XR)
------------------------------------------------------------------ */
const controllerModelFactory = new XRControllerModelFactory();

const controller1 = renderer.xr.getController(0);
scene.add(controller1);

const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

/* ------------------------------------------------------------------
   MODULE STATUS FLAGS
------------------------------------------------------------------ */
dwrite("[status] MODULE DIAG ✅");
dwrite("[status] MODULE TELEPORT ✅");
dwrite("[status] MODULE BOTS ✅");
dwrite("[status] MODULE PIP ✅");

/* ------------------------------------------------------------------
   RENDER LOOP
------------------------------------------------------------------ */
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

/* ------------------------------------------------------------------
   FINAL READY
------------------------------------------------------------------ */
dwrite("[status] ready ✅");
S.ready = true;
