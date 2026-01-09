// /js/main.js — Scarlett Poker VR MASTER v12.0
// - Hands-only visuals (no controller models)
// - Smooth move + strafe + snap turn
// - Teleport pads + ray teleport
// - World: store walk-in + teleporter arch + oval table + decor
// - Bots: seated properly + hands on table
// - Poker: real shuffled deck + 7-card evaluation + showdown highlight

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { HandsSystem } from "./hands.js";
import { DealingMix } from "./dealingMix.js";
import { PokerSim } from "./poker.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m) => {
  console.log(m);
  if (logEl) logEl.textContent += "\n" + String(m);
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 7, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Ask for hand tracking
renderer.xr.addEventListener("sessionstart", () => {
  const s = renderer.xr.getSession?.();
  if (!s) return;
  // request optional features already set by browser; index shows you do it.
  log("[main] XR session started ✅");
});

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// Default spawn (world overrides)
player.position.set(0, 0, 6.0);
player.rotation.set(0, 0, 0);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTS ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));

const dir = new THREE.DirectionalLight(0xffffff, 1.05);
dir.position.set(7, 12, 6);
scene.add(dir);

const pink = new THREE.PointLight(0xff2d7a, 0.45, 22);
pink.position.set(0, 3.2, -6);
scene.add(pink);

const aqua = new THREE.PointLight(0x7fe7ff, 0.50, 22);
aqua.position.set(0, 3.2, -10);
scene.add(aqua);

// ---------- CONTROLLERS (NO MODELS; ONLY RAYS FOR TELEPORT) ----------
const controllers = [];
function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ color: 0xb200ff, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser());
  player.add(c);
  controllers.push(c);
}

// Hide rays when not in XR (prevents “floating lasers on mobile”)
function updateControllerVisibility() {
  const on = !!renderer.xr?.isPresenting;
  for (const c of controllers) c.visible = on;
}
renderer.xr.addEventListener?.("sessionstart", updateControllerVisibility);
renderer.xr.addEventListener?.("sessionend", updateControllerVisibility);
updateControllerVisibility();

log("[main] controllers (rays only) ✅");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

if (world?.spawn) {
  player.position.set(world.spawn.x, 0, world.spawn.z);
  player.rotation.set(0, world.spawnYaw || 0, 0);
}
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.1, world.tableFocus.z);

world?.connect?.({ playerRig: player, camera, renderer, controllers });

log("[main] world loaded ✅");

// ---------- CONTROLS ----------
const controls = Controls.init({
  THREE, renderer, camera, player, controllers, log, world
});

// ---------- HANDS (GLOVES + WATCH) ----------
const hands = HandsSystem.init({ THREE, scene, renderer, player, camera, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({
  THREE, scene, renderer, camera, player, controllers, log, world
});

// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });

// ---------- POKER SIM (REAL) ----------
const sim = PokerSim.init({
  THREE,
  world,
  dealing,
  log
});
sim.start();

// ---------- UI EVENTS ----------
window.addEventListener("scarlett-recenter", () => {
  if (world?.spawn) player.position.set(world.spawn.x, 0, world.spawn.z);
  else player.position.set(0, 0, 6.0);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.1, world.tableFocus.z);
  log("[main] recentered ✅");
});

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

  world?.tick?.(dt);
  controls?.update?.(dt);
  teleport?.update?.(dt);
  hands?.update?.(dt);
  sim?.update?.(dt);
  dealing?.update?.(dt);

  renderer.render(scene, camera);
});

log("[main] ready ✅");
