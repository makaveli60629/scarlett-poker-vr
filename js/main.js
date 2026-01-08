// /js/main.js — Scarlett Poker VR Boot v10.9 (FULL + HUD FLAGS + SAFE)
// GitHub Pages safe. Uses your importmap (CDN "C & D").
// Key fixes:
// - Uses HandsSystem (named export) correctly
// - Hooks HUD toggles from index.html (window.__SCARLETT_FLAGS + events)
// - Bots billboard to player (Bots.setPlayerRig)
// - Hard room clamp to stop walking through walls (uses world.roomClamp)
// - Teleport can be toggled without breaking
// - Hands can be toggled without breaking
// - Logs to HUD #log if present

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
const log = (...args) => {
  try { console.log(...args); } catch {}
  try {
    if (!logEl) return;
    const line = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logEl.textContent += (logEl.textContent ? "\n" : "") + line;
    logEl.scrollTop = logEl.scrollHeight;
  } catch {}
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- FLAGS (from index.html) ----------
const FLAGS = (window.__SCARLETT_FLAGS ||= { teleport: true, move: true, snap: true, hands: true });

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 4, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);

// VR button (Three injects button element)
try {
  const vrBtn = VRButton.createButton(renderer);
  // Add class so your CSS positions it
  try { vrBtn.classList.add("vrButton"); } catch {}
  document.body.appendChild(vrBtn);
  log("[main] VRButton appended ✅");
} catch (e) {
  log("[main] VRButton failed:", e?.message || e);
}

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn position
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING (baseline; world adds more) ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(10, 16, 8);
scene.add(dir);

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser(color = 0x00ffcc) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  line.name = "Laser";
  line.scale.z = 10;
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser(i === 0 ? 0x00ffcc : 0x7fe7ff));
  scene.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  try { g.add(controllerModelFactory.createControllerModel(g)); } catch {}
  scene.add(g);
  grips.push(g);
}

log("[main] controllers ready ✅");

// ---------- WORLD ----------
let world = null;
try {
  world = await initWorld({ THREE, scene, log, v: BOOT_V });
  log("[main] world loaded ✅");
} catch (e) {
  log("[main] world init failed ❌", e?.message || e);
  throw e;
}

// Look toward table
if (world?.tableFocus) {
  camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
}

// Connect optional world modules (teleport machine, etc.)
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

// ---------- DEALING ----------
let dealing = null;
try {
  dealing = DealingMix.init({ THREE, scene, log, world });
  dealing?.startHand?.();
  log("[main] dealingMix ready ✅");
} catch (e) {
  log("[main] dealingMix init failed ⚠️", e?.message || e);
}

// ---------- BOTS: billboard to YOU ----------
try { world?.bots?.setPlayerRig?.(player, camera); } catch {}
// If bots module loads after init, world.tick calls it; but this helps if it already exists.
try {
  if (world?.bots?.setPlayerRig) {
    world.bots.setPlayerRig(player, camera);
    log("[main] bots linked to player ✅");
  }
} catch {}

// ---------- HUD EVENTS ----------
window.addEventListener("scarlett-toggle-teleport", (e) => {
  FLAGS.teleport = !!e.detail;
  log("[hud] teleport=" + FLAGS.teleport);
});

window.addEventListener("scarlett-toggle-hands", (e) => {
  FLAGS.hands = !!e.detail;
  try { hands?.setEnabled?.(FLAGS.hands); } catch {}
  log("[hud] hands=" + FLAGS.hands);
});

// Move/Snap toggles are handled by controls.js right now,
// but we still track the flags so later we can enforce them.
window.addEventListener("scarlett-toggle-move", (e) => {
  FLAGS.move = !!e.detail;
  log("[hud] move=" + FLAGS.move);
});

window.addEventListener("scarlett-toggle-snap", (e) => {
  FLAGS.snap = !!e.detail;
  log("[hud] snap=" + FLAGS.snap);
});

// Recenter (index fires this)
window.addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.0, world.tableFocus.z);
  log("[main] recentered ✅");
});

// Action hook (reserved for “Sit / Join table”)
window.addEventListener("scarlett-action", () => {
  try { world?.onAction?.({ player, camera }); } catch {}
});

// ---------- DESKTOP RESIZE ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- HARD ROOM CLAMP (stops walking through walls) ----------
function clampPlayerToRoom() {
  const c = world?.roomClamp;
  if (!c) return;

  player.position.x = Math.max(c.minX, Math.min(c.maxX, player.position.x));
  player.position.z = Math.max(c.minZ, Math.min(c.maxZ, player.position.z));
}

// ---------- MAIN LOOP ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // world tick
  try { world?.tick?.(dt); } catch (e) { console.error(e); }

  // controls tick (always; controls.js internally chooses XR/desktop)
  try {
    // soft enforcement of flags:
    // controls.js doesn’t currently expose enable toggles, but we can safely no-op
    // by freezing movement when move=false (temporary).
    if (!FLAGS.move && !renderer.xr?.isPresenting) {
      // desktop: prevent drift by not updating controls
    } else {
      controls?.update?.(dt);
    }
  } catch (e) { console.error(e); }

  // teleport tick (only when enabled)
  try { if (FLAGS.teleport) teleport?.update?.(dt); } catch (e) { console.error(e); }

  // dealing tick
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }

  // hands tick (only if enabled; setEnabled also toggles visibility)
  try { if (FLAGS.hands) hands?.update?.(dt); } catch (e) { console.error(e); }

  // clamp player to room (prevents walking through walls)
  try { clampPlayerToRoom(); } catch {}

  renderer.render(scene, camera);
});

log("[main] ready ✅");
