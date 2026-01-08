// /js/main.js — Scarlett Poker VR Boot v10.4 (FULL UPGRADED / STABLE)
// GitHub Pages safe
// - Controllers/grips are parented to PlayerRig so they never "drift away" when you move.
// - HandsSystem is optional but expected to exist at ./hands.js exporting HandsSystem.
// - World/Controls/Teleport/DealingMix remain modular.

// IMPORTANT:
// This file assumes you have /js/three.js as your three wrapper.
// If your project uses bare "three" imports instead, change the first 3 imports accordingly.

import * as THREE from "./three.js";
import { VRButton } from "./three.js";
import { XRControllerModelFactory } from "./three.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";

// Hands (must export HandsSystem from /js/hands.js)
import { HandsSystem } from "./hands.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  try { console.log(m, ...rest); } catch {}
  if (logEl) {
    const line = typeof m === "string" ? m : JSON.stringify(m);
    logEl.textContent += "\n" + line + (rest?.length ? " " + rest.map(String).join(" ") : "");
    logEl.scrollTop = logEl.scrollHeight;
  }
};

const BUILD_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BUILD_V);
log("location.href=" + location.href);
log("navigator.xr=" + !!navigator.xr);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 2, 60);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  250
);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

// modern lighting defaults
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn pose
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (BASE) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));

const dir = new THREE.DirectionalLight(0xffffff, 1.25);
dir.position.set(7, 12, 6);
scene.add(dir);

scene.add(new THREE.AmbientLight(0xffffff, 0.22));

// ---------- XR CONTROLLERS (PARENTED TO PLAYER) ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());

  // ✅ Parent to player rig (fixes controller drifting when player moves/teleports)
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));

  // ✅ Parent to player rig too
  player.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------- WORLD ----------
let world = null;
try {
  world = await initWorld({ THREE, scene, log, v: BUILD_V });
  log("[main] world loaded ✅");
} catch (e) {
  log("[main] world init failed ❌ " + (e?.message || e));
  console.error(e);
}

// Optional: look at table
try {
  if (world?.tableFocus) {
    camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  }
} catch {}

// Give world a chance to connect teleporter machine, etc.
try {
  world?.connect?.({ playerRig: player, controllers });
} catch {}

// ---------- CONTROLS ----------
let controls = null;
try {
  controls = Controls.init({
    THREE,
    renderer,
    camera,
    player,
    controllers,
    grips,     // some control rigs use grip space
    log,
    world,
  });
  log("[main] controls init ✅");
} catch (e) {
  log("[main] controls init failed ❌ " + (e?.message || e));
  console.error(e);
}

// ---------- TELEPORT ----------
let teleport = null;
try {
  teleport = Teleport.init({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers,
    log,
    world,
  });
  log("[main] teleport init ✅");
} catch (e) {
  log("[main] teleport init failed ❌ " + (e?.message || e));
  console.error(e);
}

// ---------- HANDS (VISIBLE GLOVES) ----------
let hands = null;
try {
  hands = HandsSystem.init({ THREE, scene, renderer, log });
  log("[main] hands init ✅");
} catch (e) {
  // If hands.js is missing or export is wrong, this is where it would fail.
  log("[main] hands init failed ❌ " + (e?.message || e));
  console.error(e);
}

// Tell bots about player rig so name tags / cards can billboard toward you (if bots supports it)
try {
  world?.bots?.setPlayerRig?.(player, camera);
} catch {}

// ---------- DEALING ----------
let dealing = null;
try {
  dealing = DealingMix.init({ THREE, scene, log, world });
  dealing.startHand?.();
  log("[main] dealing started ✅");
} catch (e) {
  log("[main] dealing init failed ❌ " + (e?.message || e));
  console.error(e);
}

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);

  try {
    if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  } catch {}

  log("[main] recentered ✅");
});

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- LOOP ----------
let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try { world?.tick?.(dt); } catch (e) { console.error(e); }
  try { controls?.update?.(dt); } catch (e) { console.error(e); }
  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
