// /js/main.js — Scarlett Poker VR Boot v11.0 (PokerSim wired)
// Fixes:
// - Imports PokerSim correctly (no more "export named PokerSim" error)
// - Runs real Hold'em state machine (cards + showdown winners)
// - Keeps your existing world/teleport/controls/hands/dealing pipeline stable

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

// ✅ IMPORTANT: this must match what poker.js exports
import { PokerSim } from "./poker.js";

// ---------- LOG ----------
const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  try {
    if (logEl) {
      logEl.textContent += "\n" + String(m);
      logEl.scrollTop = logEl.scrollHeight;
    }
  } catch {}
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 6, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  300
);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Prefer local-floor for Quest standing scale
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// Default spawn (world can override)
player.position.set(0, 0, 3.6);
player.rotation.set(0, 0, 0);
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

// ---------- XR CONTROLLERS ----------
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xb200ff,
    transparent: true,
    opacity: 0.95,
  });
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
log("[main] controllers ready ✅");

// Hide controllers when not in XR (prevents “floating in front” on mobile/desktop)
function updateControllerVisibility() {
  const on = !!renderer.xr?.isPresenting;
  for (const c of controllers) c.visible = on;
  for (const g of grips) g.visible = on;
}
renderer.xr.addEventListener?.("sessionstart", updateControllerVisibility);
renderer.xr.addEventListener?.("sessionend", updateControllerVisibility);
updateControllerVisibility();

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });

// Spawn at world spawn if available
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

// ---------- TELEPORT ----------
const teleport = Teleport.init({
  THREE, scene, renderer, camera, player, controllers, log, world
});

// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- POKER ENGINE ----------
const poker = PokerSim.create({
  seats: 6,
  log,
  // You can tune timing here (slower = easier to watch)
  tDealHole: 1.2,
  tFlop: 1.6,
  tTurn: 1.4,
  tRiver: 1.4,
  tShowdown: 2.5,
  tNextHand: 1.2,
  toyBetting: true,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

// Wire events to HUD log (and to DealingMix if helper methods exist later)
poker.on("state", (s) => {
  log(`[poker] state=${s.phase} street=${s.street} pot=$${s.pot}`);
  // optional future hook:
  if (typeof dealing?.setPot === "function") dealing.setPot(s.pot);
});

poker.on("blinds", (b) => {
  log(`[poker] blinds: SB seat=${b.sb+1} $${b.small} | BB seat=${b.bb+1} $${b.big} | pot=$${b.pot}`);
});

poker.on("action", (a) => {
  if (a.type === "FOLD") log(`[poker] ${a.name} FOLDS`);
  if (a.type === "BET") log(`[poker] ${a.name} BETS $${a.amount} (pot=$${a.pot})`);
});

poker.on("deal", (d) => {
  if (d.type === "HOLE") {
    log("[poker] hole dealt");
    // optional future hook:
    if (typeof dealing?.setHoleCards === "function") dealing.setHoleCards(d.players);
  } else {
    log(`[poker] ${d.type}: ${d.community?.map?.(c => (c?.r ? "?" : c))?.join?.(" ") || ""}`);
    // optional future hook:
    if (typeof dealing?.setCommunity === "function") dealing.setCommunity(d.community);
  }
});

poker.on("showdown", (sd) => {
  const w = sd.winners?.[0];
  if (!w) return;
  log(`[poker] SHOWDOWN pot=$${sd.pot} winner(s)=${sd.winners.length}`);
  for (const win of sd.winners) {
    log(`  - ${win.name} wins $${win.amount} with ${win.handName} | best5=${(win.best5||[]).join(" ")}`);
    log(`    hole=${(win.hole||[]).join(" ")} usedHole=${(win.used?.holeIdx||[]).join(",")} usedComm=${(win.used?.commIdx||[]).join(",")}`);
  }
  // optional future hook:
  if (typeof dealing?.showShowdown === "function") dealing.showShowdown(sd);
});

poker.startHand();
log("[main] PokerSim started ✅");

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

// Safety: log unhandled promise errors
window.addEventListener("unhandledrejection", (e) => {
  console.error(e);
  log("❌ unhandledrejection: " + (e?.reason?.message || e?.reason || e));
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
  try { poker?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
