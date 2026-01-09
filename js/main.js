// /js/main.js — Scarlett Poker VR Boot v12.0 (FULL)
// ✅ Direct Enter VR via HUD event (fixes crash-before-enter)
// ✅ Quest-safe sessionstart perf profile (pixel ratio + foveation)
// ✅ Full pipeline: world + controls + teleport + hands + dealing + poker
// ✅ No duplicate THREE declarations

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

// ---------- XR: Direct Enter VR (HUD calls this) ----------
renderer.xr.addEventListener("sessionstart", () => {
  try {
    renderer.setPixelRatio(1.0);
    renderer.xr.setFoveation?.(1.0);
  } catch {}
  log("[xr] sessionstart ✅");
});

renderer.xr.addEventListener("sessionend", () => {
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  } catch {}
  log("[xr] sessionend ✅");
});

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

// ---------- CONTROLS ----------
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });

// ---------- HANDS ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });

// ---------- POKER ----------
const poker = PokerSim.create({
  seats: 6,
  log,
  toyBetting: true,
  tDealHole: 1.2,
  tFlop: 1.6,
  tTurn: 1.4,
  tRiver: 1.4,
  tShowdown: 2.6,
  tNextHand: 1.2,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

poker.on("state", (s) => {
  dealing?.setPot?.(s.pot);
  dealing?.setStreet?.(s.street);
});

poker.on("action", (a) => {
  if (a.type === "FOLD") dealing?.setAction?.(`${a.name} FOLDS`);
  if (a.type === "BET") dealing?.setAction?.(`${a.name} BETS $${a.amount}`);
});

poker.on("deal", (d) => {
  if (d.type === "HOLE") {
    dealing?.setHoleCards?.(d.players);
  } else {
    dealing?.setCommunity?.(d.communityRaw || d.community || []);
  }
});

poker.on("showdown", (sd) => {
  dealing?.showShowdown?.(sd);
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
// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });

// ---------- POKER ENGINE ----------
const poker = PokerSim.create({
  seats: 6,
  log,
  maxHands: 12,        // ✅ 12 round game like you asked
  tDealHole: 1.2,
  tFlop: 1.6,
  tTurn: 1.4,
  tRiver: 1.4,
  tShowdown: 2.6,
  tNextHand: 1.2,
  toyBetting: true,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

// ✅ Wire Poker → DealingMix
poker.on("state", (s) => {
  // update HUD street + action
  dealing?.setStreet?.(s.street);
  dealing?.setAction?.(s.actionText || s.phase || "—");
  dealing?.setPot?.(s.pot);
  log(`[poker] state=${s.phase} street=${s.street} pot=$${s.pot}`);
});

poker.on("blinds", (b) => {
  dealing?.onBlinds?.(b);
  dealing?.setPot?.(b.pot);
  log(`[poker] blinds: SB=${b.small} BB=${b.big} pot=$${b.pot}`);
});

poker.on("action", (a) => {
  dealing?.onAction?.(a);
  log(`[poker] ${a.name} ${a.type}${a.amount ? " $" + a.amount : ""}`);
});

poker.on("deal", (d) => {
  dealing?.onDeal?.(d);     // ✅ HOLE/FLOP/TURN/RIVER handled inside DealingMix
});

poker.on("showdown", (sd) => {
  dealing?.onShowdown?.(sd);  // ✅ THIS is what makes hole cards fly into the 5-card row
  const w = sd?.winners?.[0];
  if (w) log(`[poker] SHOWDOWN winner=${w.name} hand=${w.handName}`);
});

poker.on("finished", (f) => {
  dealing?.showFinished?.(f);
  log(`[poker] FINISHED hands=${f.handsPlayed}`);
});

// Start
poker.startHand();
log("[main] PokerSim started ✅");
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
