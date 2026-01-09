// /js/main.js — Scarlett Poker VR Boot v12.3 (FULL)
// ✅ Keeps your existing pipeline (world + controls + teleport + hands + dealing + poker)
// ✅ Fixes chairs/furniture AFTER world loads (auto-detects chairs/seats and flips if needed)
// ✅ Makes DealingMix use TABLE hole cards + hover reflection (requires DealingMix v2.4)
// ✅ Forces high-stakes (20,000) via PokerSim option
// ✅ Adds “decision time” pacing by stretching street timers (PokerSim doesn’t have per-player think phases yet)

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";
import { PokerSim } from "./poker.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  try { console.log(m, ...rest); } catch {}
  try {
    if (logEl) {
      logEl.textContent += "\n" + String(m);
      logEl.scrollTop = logEl.scrollHeight;
    }
  } catch {}
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- TUNING (YOU ASKED: slower + high stakes) ----------
const GAME = {
  seats: 6,
  startingStack: 20000,

  // You asked ~15 seconds per player. PokerSim v1.2 has no explicit per-player action loop,
  // so we approximate by stretching each street timer.
  // For 6 seats: 6 * 15 = 90 seconds per street (very slow). You can reduce if needed.
  decisionSecondsPerPlayer: 15,
  approxStreetSeconds() { return this.seats * this.decisionSecondsPerPlayer; },

  // Dealing cinematic timing
  tDealHole: 6.0,           // hole dealing animation window
  tShowdown: 8.0,
  tNextHand: 4.0,
};

// Flop/Turn/River street durations (approx decisions)
// If you want EXACT 15s per player with individual decisions, we’ll patch poker.js next.
const STREET_SECONDS = Math.max(20, GAME.approxStreetSeconds()); // safety min
const tFlop = STREET_SECONDS;
const tTurn = STREET_SECONDS;
const tRiver = STREET_SECONDS;

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 6, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER (Quest-safe defaults) ----------
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);

// VRButton kept as fallback/native
try {
  document.body.appendChild(VRButton.createButton(renderer));
  log("[main] VRButton appended ✅");
} catch (e) {
  log("❌ VRButton failed: " + (e?.message || e));
}

// ---------- XR: session perf tuning ----------
renderer.xr.addEventListener("sessionstart", () => {
  try {
    renderer.setPixelRatio(1.0);
    renderer.xr.setFoveation?.(1.0);
  } catch {}
  log("[xr] sessionstart ✅");
});

renderer.xr.addEventListener("sessionend", () => {
  try { renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); } catch {}
  log("[xr] sessionend ✅");
});

// ---------- XR: Direct Enter VR (HUD should dispatch scarlett-enter-vr) ----------
window.addEventListener("scarlett-enter-vr", async () => {
  try {
    const xr = navigator.xr;
    if (!xr) throw new Error("navigator.xr missing");

    const ok = await xr.isSessionSupported?.("immersive-vr");
    if (ok === false) throw new Error("immersive-vr not supported");

    const session = await xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });

    await renderer.xr.setSession(session);
    log("[xr] requestSession ✅ (entered VR)");
  } catch (e) {
    log("❌ [xr] Enter VR failed: " + (e?.message || e));
    console.error(e);
  }
});

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// spawn defaults
player.position.set(0, 0, 3.6);
player.rotation.set(0, 0, 0);
camera.position.set(0, 1.65, 0);

// ---------- LIGHTING ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));

const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(7, 12, 6);
scene.add(dir);

const pink = new THREE.PointLight(0xff2d7a, 0.65, 18);
pink.position.set(0, 3.0, -5.5);
scene.add(pink);

const aqua = new THREE.PointLight(0x7fe7ff, 0.55, 18);
aqua.position.set(0, 3.0, -7.5);
scene.add(aqua);

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
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
  g.add(controllerModelFactory.createControllerModel(g));
  player.add(g);
  grips.push(g);
}

function updateControllerVisibility() {
  const on = !!renderer.xr?.isPresenting;
  for (const c of controllers) c.visible = on;
  for (const g of grips) g.visible = on;
}
renderer.xr.addEventListener?.("sessionstart", updateControllerVisibility);
renderer.xr.addEventListener?.("sessionend", updateControllerVisibility);
updateControllerVisibility();

log("[main] controllers ready ✅");

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

// ✅ Required for DealingMix facing player
world.cameraRef = camera;

// Provide safe defaults
if (!world.tableFocus) world.tableFocus = new THREE.Vector3(0, 0, -6.5);
if (!world.tableY) world.tableY = 0.92;

if (world?.spawn) {
  player.position.set(world.spawn.x, 0, world.spawn.z);
  player.rotation.set(0, world.spawnYaw || 0, 0);
}
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);

try { world?.connect?.({ playerRig: player, camera, controllers, grips, renderer }); } catch {}
log("[main] world loaded ✅");

// ✅ Fix chairs & seating after load (does not remove anything)
try {
  fixFurnitureAndSeating({ THREE, scene, world, log });
  log("[main] furniture fix pass ✅");
} catch (e) {
  log("❌ [main] furniture fix pass failed: " + (e?.message || e));
}

// ---------- CONTROLS ----------
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });

// ---------- HANDS ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });

// Ask DealingMix v2.4+ to do TABLE hole + hover reflection
try {
  dealing?.setPresentation?.({
    holeCardsOnTable: true,
    hoverReflection: true,
    flopStyle: "3-then-1-then-1",
    winnerRevealFlyToCommunity: true
  });
} catch {}

// ---------- POKER ENGINE ----------
const poker = PokerSim.create({
  seats: GAME.seats,
  log,
  maxHands: 999999,

  // High stakes
  startingStack: GAME.startingStack,

  // Slow cinematic timings
  tDealHole: GAME.tDealHole,
  tFlop,
  tTurn,
  tRiver,
  tShowdown: GAME.tShowdown,
  tNextHand: GAME.tNextHand,

  toyBetting: true,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

// Wire Poker → DealingMix
poker.on("state", (s) => {
  dealing?.setStreet?.(s.street);
  dealing?.setAction?.(s.actionText || s.phase || "—");
  dealing?.setPot?.(s.pot);
});

poker.on("blinds", (b) => {
  dealing?.onBlinds?.(b);
  dealing?.setPot?.(b.pot);
});

poker.on("action", (a) => {
  dealing?.onAction?.(a);
});

poker.on("deal", (d) => {
  dealing?.onDeal?.(d);
});

poker.on("showdown", (sd) => {
  dealing?.onShowdown?.(sd);
});

poker.on("finished", (f) => {
  dealing?.showFinished?.(f);
});

poker.startHand();
log("[main] PokerSim started ✅");

// ---------- HUD EVENTS ----------
window.addEventListener("scarlett-recenter", () => {
  if (world?.spawn) player.position.set(world.spawn.x, 0, world.spawn.z);
  else player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
  if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);
  log("[main] recentered ✅");
});

// ---------- RESIZE / ERROR ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error(e);
  log("❌ unhandledrejection: " + (e?.reason?.message || e?.reason || e));
});
window.addEventListener("error", (e) => {
  log("❌ window.error: " + (e?.message || e));
});

// ---------- LOOP ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try { world?.tick?.(dt); } catch {}
  try { controls?.update?.(dt); } catch {}
  try { teleport?.update?.(dt); } catch {}
  try { poker?.update?.(dt); } catch {}
  try { dealing?.update?.(dt); } catch {}
  try { hands?.update?.(dt); } catch {}

  renderer.render(scene, camera);
});

log("[main] ready ✅");

// =====================================================
// Furniture/Seating Fix Utilities
// =====================================================
function fixFurnitureAndSeating({ THREE, scene, world, log }) {
  const center = new THREE.Vector3(
    world?.tableFocus?.x ?? 0,
    0,
    world?.tableFocus?.z ?? 0
  );

  // Prefer explicit arrays from world.js if present
  let chairs = world?.chairs || world?.seats || world?.seatChairs || null;

  // If not present, best-effort name search
  if (!chairs || !chairs.length) chairs = findManyByNameLike(scene, ["chair", "seat"]);

  if (!chairs || !chairs.length) {
    log("[fix] no chairs found.");
    return;
  }

  const tmpFwd = new THREE.Vector3(0, 0, -1);
  const tmpPos = new THREE.Vector3();
  const toCenter = new THREE.Vector3();

  for (const chair of chairs) {
    if (!chair) continue;

    chair.getWorldPosition(tmpPos);
    toCenter.copy(center).sub(tmpPos).setY(0);

    // Face table
    chair.lookAt(center.x, chair.position.y, center.z);

    // If chair model is reversed, flip
    const fwd = tmpFwd.clone().applyQuaternion(chair.quaternion).setY(0).normalize();
    const dir = toCenter.clone().normalize();
    const dot = fwd.dot(dir);
    if (dot < -0.25) chair.rotateY(Math.PI);

    // Small outward nudge to avoid clipping
    const away = tmpPos.clone().sub(center).setY(0);
    if (away.length() > 0.001) {
      away.normalize();
      chair.position.addScaledVector(away, 0.04);
    }
  }

  // If world exposes a seating fix, run it
  try { world?.fixSeating?.(); } catch {}
}

function findManyByNameLike(root, needles) {
  const out = [];
  root.traverse(o => {
    const n = (o.name || "").toLowerCase();
    if (!n) return;
    if (needles.some(k => n.includes(k))) out.push(o);
  });
  const seen = new Set();
  return out.filter(o => (seen.has(o.uuid) ? false : (seen.add(o.uuid), true)));
      }
