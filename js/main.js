// /js/main.js — Scarlett Poker VR Boot v10.7 (FULL STABLE + Controller Fix)
// Fixes:
// - Controllers no longer “float in front” when not present (hand-tracking / missing controller).
// - Auto-hide/show controller models + lasers based on active inputSources.
// - HandsSystem enabled/disabled via HUD flag events.
// - Bots billboarding gets camera/player rig reference.

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
const log = (m, ...rest) => {
  try { console.log(m, ...rest); } catch {}
  if (logEl) {
    logEl.textContent += "\n" + String(m);
    logEl.scrollTop = logEl.scrollHeight;
  }
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);
log("href=" + location.href);
log("ua=" + (navigator.userAgent || ""));
log("navigator.xr=" + (!!navigator.xr));

// ---------- FLAGS FROM HUD ----------
const FLAGS = (window.__SCARLETT_FLAGS ||= {
  teleport: true,
  move: true,
  snap: true,
  hands: true
});

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 3, 75);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn position
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (global baseline) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];
const lasers = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;

  const laser = makeLaser();
  laser.name = "Laser";
  c.add(laser);

  // IMPORTANT: keep them in scene (Three updates poses in reference space),
  // but we will AUTO-HIDE them unless they are actually present.
  scene.add(c);

  controllers.push(c);
  lasers.push(laser);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  scene.add(g);
  grips.push(g);
}

log("[main] controllers created ✅");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
}
log("[main] world loaded ✅");

// Connect optional world features (teleporter machine visuals etc.)
try { world?.connect?.({ playerRig: player, controllers }); } catch {}

// ---------- CONTROLS ----------
const controls = Controls.init({
  THREE,
  renderer,
  camera,
  player,
  controllers,
  grips,
  log,
  world
});

// ---------- HANDS ----------
const hands = HandsSystem.init({
  THREE,
  scene,
  renderer,
  log
});
hands?.setEnabled?.(!!FLAGS.hands);

// ---------- TELEPORT ----------
const teleport = Teleport.init({
  THREE,
  scene,
  renderer,
  camera,
  player,
  controllers,
  log,
  world
});
teleport?.setEnabled?.(!!FLAGS.teleport);

// ---------- DEALING ----------
const dealing = DealingMix.init({
  THREE,
  scene,
  log,
  world,
  // sizing knobs (your request)
  scale: {
    hole: 2.0,       // “cards twice as big”
    community: 4.0   // “community four times as big”
  },
  lift: {
    table: 0.06,     // lift cards above felt so they don’t clip
    communityHover: 0.22
  }
});
dealing.startHand?.();

// ---------- HUD EVENTS ----------
window.addEventListener("scarlett-toggle-hands", (e) => {
  FLAGS.hands = !!e?.detail;
  hands?.setEnabled?.(FLAGS.hands);
  log("[main] hands=" + FLAGS.hands);
});

window.addEventListener("scarlett-toggle-teleport", (e) => {
  FLAGS.teleport = !!e?.detail;
  teleport?.setEnabled?.(FLAGS.teleport);
  log("[main] teleport=" + FLAGS.teleport);
});

// (move/snap flags are honored inside Controls via FLAGS read in update below)

// ---------- RECENTER ----------
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- INPUT VISIBILITY FIX (THE BIG ONE) ----------
function updateXRInputVisibility() {
  const xr = renderer.xr;
  if (!xr?.isPresenting) {
    // desktop: hide XR stuff
    for (let i = 0; i < 2; i++) {
      controllers[i].visible = false;
      grips[i].visible = false;
    }
    return;
  }

  const session = xr.getSession?.();
  const sources = session?.inputSources || [];

  // detect if hands exist (hand-tracking)
  const hasHands = sources.some(s => s.hand);

  // determine which controllers actually exist
  const present = { left: false, right: false };
  for (const s of sources) {
    // controller if it has gamepad and NOT hand
    if (s?.gamepad && !s.hand && (s.handedness === "left" || s.handedness === "right")) {
      present[s.handedness] = true;
    }
  }

  // If hands exist, we prefer hands; only show controller models if present.
  for (let i = 0; i < 2; i++) {
    const handedness = (i === 0) ? "left" : "right";
    const showController = present[handedness];

    controllers[i].visible = showController;
    grips[i].visible = showController;

    // laser only when teleport is on
    lasers[i].visible = showController && !!FLAGS.teleport;
  }

  // hands enabled if flag, and if hands exist OR controllers exist (gloves still helpful)
  hands?.setEnabled?.(!!FLAGS.hands);
}

// ---------- LOOP ----------
let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // This runs every frame and fixes “controller in front”
  try { updateXRInputVisibility(); } catch {}

  try { world?.tick?.(dt); } catch (e) { console.error(e); }

  // Respect HUD flags
  try {
    if (FLAGS.move || FLAGS.snap) controls?.update?.(dt);
  } catch (e) { console.error(e); }

  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
