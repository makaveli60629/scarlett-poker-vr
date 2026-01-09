// /js/main.js — Scarlett Poker VR Boot v12.2 (CLEAN FULL)
// ✅ Post-world chair + bot seating corrective pass (does not remove anything)
// ✅ High stakes default: 20,000 stacks (passed to PokerSim if supported)
// ✅ Slow cinematic pacing (incl. optional 15s decision time per player)
// ✅ Keeps your existing pipeline + event wiring intact

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

// ✅ NEW: Global tuning knobs (safe, centralized)
const GAME = {
  seats: 6,
  startingStack: 20000,           // high stakes
  decisionSeconds: 15,            // per-player decision target
  // Visual pacing (seconds) — slower & more watchable
  tDealHole: 3.2,                 // hole cards total animation time
  tFlop: 3.0,                     // flop staging
  tTurn: 2.6,
  tRiver: 2.6,
  tShowdown: 6.0,
  tNextHand: 3.0,
  maxHands: 999999,               // endless unless you cap it
};

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

if (world?.spawn) {
  player.position.set(world.spawn.x, 0, world.spawn.z);
  player.rotation.set(0, world.spawnYaw || 0, 0);
}
if (world?.tableFocus) camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z);

try { world?.connect?.({ playerRig: player, camera, controllers, grips, renderer }); } catch {}
log("[main] world loaded ✅");

// ✅ NEW: Post-world furniture fix pass (chairs + seated bots orientation)
// This does NOT remove anything; it only rotates / nudges chairs to face table.
try {
  fixFurniturePass({ THREE, scene, world, log });
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

// ✅ NEW: Ask DealingMix to enable table+hover presentation if supported (safe optional)
try {
  dealing?.setPresentation?.({
    holeCardsOnTable: true,
    hoverReflection: true,
    flopStyle: "3-then-1-then-1",      // flop then turn then river
    winnerRevealFlyToCommunity: true
  });
  dealing?.setDecisionSeconds?.(GAME.decisionSeconds);
  dealing?.setStartingStack?.(GAME.startingStack);
} catch {}

// ---------- POKER ENGINE ----------
const poker = PokerSim.create({
  seats: GAME.seats,
  log,
  maxHands: GAME.maxHands,

  // ✅ NEW: slower timings
  tDealHole: GAME.tDealHole,
  tFlop: GAME.tFlop,
  tTurn: GAME.tTurn,
  tRiver: GAME.tRiver,
  tShowdown: GAME.tShowdown,
  tNextHand: GAME.tNextHand,

  // ✅ NEW: high stakes + slow decisions (if PokerSim supports these keys, it will use them)
  startingStack: GAME.startingStack,
  tDecision: GAME.decisionSeconds,
  tThink: GAME.decisionSeconds,
  decisionSeconds: GAME.decisionSeconds,

  toyBetting: true,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

// Wire Poker → DealingMix (this enables “winner cards fly into best5”)
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
// ✅ NEW: Furniture fix pass helpers
// =====================================================
function fixFurniturePass({ THREE, scene, world, log }) {
  // Determine table center
  const center = new THREE.Vector3();
  if (world?.tableFocus) {
    center.set(world.tableFocus.x, 0, world.tableFocus.z);
  } else {
    // try find a table-ish object in scene
    const tableObj = scene.getObjectByName("PokerTable") || scene.getObjectByName("Table") || findByNameLike(scene, ["table", "poker"]);
    if (tableObj) tableObj.getWorldPosition(center);
    else center.set(0, 0, 0);
  }

  // Gather chairs
  const chairs =
    world?.chairs ||
    world?.seats ||
    world?.furniture?.chairs ||
    findManyByNameLike(scene, ["chair", "seat"]);

  if (!chairs || !chairs.length) {
    log("[fix] no chairs found (world.chairs/world.seats/name search).");
    return;
  }

  // Fix chair facing: lookAt table center + optional 180° flip if chair forward axis is reversed
  // We do a smart guess: if chair forward points AWAY from table, flip it.
  const tmpFwd = new THREE.Vector3(0, 0, -1);
  const tmpPos = new THREE.Vector3();
  const toCenter = new THREE.Vector3();

  for (const chair of chairs) {
    if (!chair) continue;

    chair.getWorldPosition(tmpPos);
    toCenter.copy(center).sub(tmpPos).setY(0);

    // Make it face center
    chair.lookAt(center.x, chair.position.y, center.z);

    // Guess if model is reversed: compare forward vector to direction-to-center
    const fwd = tmpFwd.clone().applyQuaternion(chair.quaternion).setY(0).normalize();
    const dir = toCenter.clone().normalize();
    const dot = fwd.dot(dir);

    // If dot is strongly negative, chair is facing away from table -> rotate 180
    if (dot < -0.25) chair.rotateY(Math.PI);

    // Slight outward nudge (prevents bots clipping through chair/table)
    const away = tmpPos.clone().sub(center).setY(0);
    if (away.length() > 0.001) {
      away.normalize();
      chair.position.addScaledVector(away, 0.03);
    }
  }

  // If your bots are attached to chairs or have seat anchors, align them too (optional)
  try {
    world?.fixSeating?.(); // if your world has a method
  } catch {}

  log(`[fix] chairs corrected: ${chairs.length}`);
}

function findByNameLike(root, needles) {
  let found = null;
  root.traverse(o => {
    if (found) return;
    const n = (o.name || "").toLowerCase();
    if (!n) return;
    if (needles.some(k => n.includes(k))) found = o;
  });
  return found;
}

function findManyByNameLike(root, needles) {
  const out = [];
  root.traverse(o => {
    const n = (o.name || "").toLowerCase();
    if (!n) return;
    if (needles.some(k => n.includes(k))) out.push(o);
  });
  // de-dupe by uuid
  const seen = new Set();
  return out.filter(o => (seen.has(o.uuid) ? false : (seen.add(o.uuid), true)));
                                        }
