// /js/main.js — Scarlett Poker VR Boot v10.5 (CDN IMPORTS / FULL / STABLE)
// Uses "three" + addons (CDN / import map style).
//
// Fixes:
// - Correct HandsSystem import from "./hands.js"
// - No duplicate "Hands" declarations
// - Parents controllers + grips to PlayerRig (prevents drifting after move/teleport)
// - Hooks bots billboard to player (if bots.js supports setPlayerRig)

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (...a) => {
  try { console.log(...a); } catch {}
  if (!logEl) return;
  const line = a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  logEl.textContent += "\n" + line;
  logEl.scrollTop = logEl.scrollHeight;
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
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

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

// ---------- XR CONTROLLERS (PARENTED TO PLAYER RIG) ----------
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

  // ✅ PERMANENT: controller moves with you because it's under PlayerRig
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));

  // ✅ ALSO parent grip under PlayerRig
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
  log("[main] world init failed ❌", e?.message || e);
  console.error(e);
}

// face table if available
try {
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
} catch {}

// allow world modules to connect (teleport machine, etc)
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
    grips,
    log,
    world,
  });
  log("[main] controls init ✅");
} catch (e) {
  log("[main] controls init failed ❌", e?.message || e);
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
  log("[main] teleport init failed ❌", e?.message || e);
  console.error(e);
}

// ---------- HANDS (GLOVES) ----------
let handsSystem = null;
try {
  handsSystem = HandsSystem.init({ THREE, scene, renderer, log });
  log("[main] hands init ✅");
} catch (e) {
  log("[main] hands init failed ❌", e?.message || e);
  console.error(e);
}

// Let bots billboard to you (tags/cards face you) if supported
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
  log("[main] dealing init failed ❌", e?.message || e);
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
  try { handsSystem?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
