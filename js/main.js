// /js/main.js — Scarlett Poker VR Boot v10.9 (HANDS-ONLY + AVATAR 4.0 + YOUR WORLD)
import { AvatarUpdate1 } from "./avatar1.js";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld, CyberAvatar } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  if (logEl) logEl.textContent += "\n" + String(m);
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 6, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);

// Use your sessionInit from index if present
const sessionInit = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor","bounded-floor","hand-tracking"] };
document.body.appendChild(VRButton.createButton(renderer, sessionInit));

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn (world will override if it has spawn)
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(7, 12, 6);
dir.castShadow = false;
scene.add(dir);

const pink = new THREE.PointLight(0xff2d7a, 0.65, 18);
pink.position.set(0, 3.0, -5.5);
scene.add(pink);

const aqua = new THREE.PointLight(0x7fe7ff, 0.55, 18);
aqua.position.set(0, 3.0, -7.5);
scene.add(aqua);

// ---------- XR CONTROLLERS (LOGIC ONLY — NEVER RENDER MODELS) ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

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

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;

  // DO NOT add visible controller models (hands-only constraint)
  // g.add(controllerModelFactory.createControllerModel(g));

  player.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅ (hidden models)");

// Always hidden visuals (we still keep them for ray origins / teleport logic)
function hideControllerVisuals() {
  for (const c of controllers) c.visible = false;
  for (const g of grips) g.visible = false;
}
renderer.xr.addEventListener?.("sessionstart", hideControllerVisuals);
renderer.xr.addEventListener?.("sessionend", hideControllerVisuals);
hideControllerVisuals();

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

if (world?.spawn) {
  player.position.set(world.spawn.x, 0, world.spawn.z);
  player.rotation.set(0, world.spawnYaw || 0, 0);
}
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);

log("[main] world loaded ✅");

try { world?.connect?.({ playerRig: player, camera, controllers, grips, renderer }); } catch {}

// ---------- CONTROLS ----------
const controls = Controls.init({
  THREE, renderer, camera, player, controllers, grips, log, world
});

// ---------- HANDS ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- AVATAR 4.0 (cyber helmet + torso + wrist gloves) ----------
const avatar = new CyberAvatar({ THREE, scene, camera, log });
window.addEventListener("scarlett-toggle-hands", (e) => avatar.setHandsVisible(!!e.detail));

// ---------- TELEPORT ----------
const teleport = Teleport.init({
  THREE, scene, renderer, camera, player, controllers, log, world
});

// ---------- DEALING ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- UI EVENTS ----------
window.addEventListener("scarlett-recenter", () => {
  if (world?.spawn) player.position.set(world.spawn.x, 0, world.spawn.z);
  else player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);
  log("[main] recentered ✅");
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error(e);
  log("❌ unhandledrejection: " + (e?.reason?.message || e?.reason || e));
});

// ---------- LOOP (IMPORTANT: receives frame for hand tracking) ----------
let last = performance.now();
renderer.setAnimationLoop((t, frame) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Give DealingMix access to camera
  world.cameraRef = camera;

  try { world?.tick?.(dt); } catch (e) { console.error(e); }
  try { controls?.update?.(dt); } catch (e) { console.error(e); }
  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  // Avatar 4.0 needs XR frame + refSpace
  try {
    if (frame && renderer.xr.isPresenting) {
      const refSpace = renderer.xr.getReferenceSpace();
      avatar.update(frame, refSpace, camera);
    }
  } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
