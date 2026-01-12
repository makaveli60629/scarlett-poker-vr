// /js/index.js — Scarlett Poker VR Runtime (FULL + fail-safe)
// Fixes: "THREE is not defined" by NEVER using global THREE.
// Spawns player in VIP by default, installs controller lasers, bright stable render.

import * as THREE_NS from "./three.js";
import { VRButton } from "./VRButton.js";
import { safeImport } from "./safe_import.js";

import { World } from "./world.js";

const BASE = window.__BASE_PATH__ || "/";
const $dbg = document.getElementById("dbg");

const log = (m) => {
  console.log(m);
  if (!$dbg) return;
  const line = document.createElement("div");
  line.textContent = m;
  $dbg.appendChild(line);
  $dbg.scrollTop = $dbg.scrollHeight;
};

// Normalize THREE module export
const THREE = (THREE_NS?.default && THREE_NS.default.Scene) ? THREE_NS.default : THREE_NS;

const S = {
  THREE,
  scene: null,
  camera: null,
  renderer: null,
  player: null,
  clock: null,
  controllers: [],
  lasers: [],
  world: null,
  audio: null,
  systems: {},
};

function makeRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Stability improvements
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  document.body.appendChild(renderer.domElement);
  return renderer;
}

function makeCamera() {
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.02, 350);
  camera.position.set(0, 1.65, 3.5);
  return camera;
}

function makePlayerRig() {
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 0, 0);
  return rig;
}

function installResize() {
  addEventListener("resize", () => {
    if (!S.camera || !S.renderer) return;
    S.camera.aspect = innerWidth / innerHeight;
    S.camera.updateProjectionMatrix();
    S.renderer.setSize(innerWidth, innerHeight);
  });
}

function getController(i) {
  const c = S.renderer.xr.getController(i);
  c.name = `controller_${i}`;
  return c;
}

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  line.name = "laser";
  line.scale.z = 12;
  return line;
}

function installLasers() {
  // Create 2 lasers – one per controller
  for (let i = 0; i < 2; i++) {
    const c = getController(i);
    S.player.add(c);
    S.controllers.push(c);

    const laser = makeLaser();
    c.add(laser);                      // <— important: parent laser to controller
    laser.position.set(0, 0, 0);
    S.lasers.push(laser);
  }
  log("[index] controller lasers installed ✅");
}

function installXRButton() {
  const btn = VRButton.createButton(S.renderer);
  document.body.appendChild(btn);
  log("[index] VRButton appended ✅");
}

async function initAudio() {
  // Fail-safe: audio module optional, mp3 optional
  const mod = await safeImport("./sound_manager.js");
  if (!mod?.SoundManager) {
    log("[audio] sound_manager.js not found (ok) – skipping");
    return;
  }
  try {
    S.audio = mod.SoundManager.create({ THREE, camera: S.camera, basePath: BASE, log });
    // optional ambience file you DO have
    S.audio?.tryLoop?.("assets/audio/lobby_ambience.mp3", { volume: 0.25, refDistance: 10 });
    log("[audio] SoundManager ready ✅ (fail-safe)");
  } catch (e) {
    log(`[audio] init failed (ignored): ${e?.message || e}`);
  }
}

async function initOptionalControls() {
  // You have a bunch of control modules; we’ll load whichever exists.
  // If none exists, movement still works via your existing rig logic later.
  const mods = [
    "./vr_locomotion.js",
    "./xr_locomotion.js",
    "./rig_controls.js",
    "./controls.js",
    "./android_controls.js",
    "./touch_controls.js",
  ];

  for (const p of mods) {
    const m = await safeImport(p);
    const key = Object.keys(m || {})[0];
    if (key) {
      S.systems.controls = m[key];
      log(`[controls] loaded ${p} ✅`);
      break;
    }
  }

  // Initialize if found
  try {
    S.systems.controls?.init?.({
      THREE, scene: S.scene, camera: S.camera, player: S.player,
      renderer: S.renderer, controllers: S.controllers, log
    });
  } catch (e) {
    log(`[controls] init failed (ignored): ${e?.message || e}`);
  }
}

function applyVIPSpawn() {
  const sp = S.world?.spawnPoints?.vip || { pos: new THREE.Vector3(10, 0, 0), yaw: Math.PI };
  S.player.position.copy(sp.pos);

  // Face the table direction (yaw)
  S.player.rotation.set(0, sp.yaw || 0, 0);

  log(`[spawn] VIP spawn applied ✅ (${sp.pos.x.toFixed(2)}, ${sp.pos.y.toFixed(2)}, ${sp.pos.z.toFixed(2)})`);
}

async function init() {
  log(`[index] runtime start ✅ base=${BASE}`);

  S.clock = new THREE.Clock();
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x05060a);

  S.renderer = makeRenderer();
  S.camera = makeCamera();
  S.player = makePlayerRig();

  // Camera is a child of player rig (so teleport/spawn moves “you”)
  S.player.add(S.camera);
  S.scene.add(S.player);

  installResize();
  installXRButton();
  installLasers();

  // Build world (this is the important part)
  S.world = await World.build({
    THREE,
    scene: S.scene,
    renderer: S.renderer,
    camera: S.camera,
    player: S.player,
    controllers: S.controllers,
    log
  });

  applyVIPSpawn();

  await initOptionalControls();
  await initAudio();

  log("[index] ready ✅");
  S.renderer.setAnimationLoop(tick);
}

function tick() {
  const dt = Math.min(0.033, S.clock.getDelta());

  // Update optional systems
  try { S.systems.controls?.update?.(dt); } catch {}
  try { S.world?.update?.(dt); } catch {}
  try { S.audio?.update?.(dt); } catch {}

  S.renderer.render(S.scene, S.camera);
}

init().catch((e) => {
  log(`[index] init FAILED ❌ ${e?.message || e}`);
  console.error(e);
});
