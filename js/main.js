// /js/main.js — Scarlett Poker VR Boot v12.0 (FULL + PokerSim → DealingMix + Bots)
// ✅ Uses PokerSim (correct export)
// ✅ Turn indicator: bot glows red + action HUD above acting seat
// ✅ Winner reveal: bot glows gold + DealingMix pulls used hole cards up
// ✅ Does NOT touch your world.js

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

import { PokerSim } from "./poker.js";
import { Bots } from "./bots.js";

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
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ---------- PLAYER RIG ----------
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

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

log("[main] world loaded ✅");

try { world?.connect?.({ playerRig: player, camera, controllers, grips, renderer }); } catch {}

// ---------- CONTROLS ----------
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });

// ---------- HANDS ----------
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// ---------- TELEPORT ----------
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.startHand?.();

// ---------- BOTS (ensure init is called even if world init didn't call it) ----------
try {
  // if your world already calls Bots.init, this is harmless (it will rebuild once)
  Bots.init({
    THREE,
    scene,
    getSeats: world?.getSeats,
    tableFocus: world?.tableFocus,
    metrics: { seatDrop: 0.075 },
    v: BOOT_V,
    log
  });
} catch (e) {
  console.error(e);
  log("[main] Bots.init failed ⚠️ " + (e?.message || e));
}

// ---------- POKER ENGINE ----------
const poker = PokerSim.create({
  seats: 6,
  log,
  tDealHole: 1.2,
  tFlop: 1.6,
  tTurn: 1.4,
  tRiver: 1.4,
  tShowdown: 2.5,
  tNextHand: 1.2,
  toyBetting: true,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

poker.on("state", (s) => {
  log(`[poker] state=${s.phase} street=${s.street} pot=$${s.pot}`);
  dealing?.setPot?.(s.pot);

  if (s.phase === "HOLE") {
    Bots?.setWinnerSeat?.(-1);
    Bots?.setActiveSeat?.(-1);
    dealing?.startHand?.();
  }
});

poker.on("blinds", (b) => {
  log(`[poker] blinds: SB seat=${b.sb+1} $${b.small} | BB seat=${b.bb+1} $${b.big}`);
  dealing?.setPot?.(b.pot);
});

poker.on("action", (a) => {
  Bots?.setActiveSeat?.(a.seat);
  dealing?.setAction?.(a);
  dealing?.setPot?.(a.pot);

  if (a.type === "FOLD") log(`[poker] ${a.name} FOLDS`);
  if (a.type === "CHECK") log(`[poker] ${a.name} CHECKS`);
  if (a.type === "BET") log(`[poker] ${a.name} BETS $${a.amount} (pot=$${a.pot})`);
});

poker.on("deal", (d) => {
  if (d.type === "HOLE") {
    log("[poker] hole dealt");
    dealing?.setHoleCards?.(d.players);
    Bots?.setActiveSeat?.(-1);
  } else {
    log(`[poker] ${d.type}`);
    dealing?.setCommunity?.(d.community);
  }
});

poker.on("showdown", (sd) => {
  log(`[poker] SHOWDOWN pot=$${sd.pot} winner(s)=${sd.winners?.length || 0}`);

  const w = sd.winners?.[0];
  if (w) {
    Bots?.setWinnerSeat?.(w.seat);
    Bots?.setActiveSeat?.(-1);
  }

  dealing?.showShowdown?.(sd);

  for (const win of (sd.winners || [])) {
    log(`  - ${win.name} wins $${win.amount} with ${win.handName} | best5=${(win.best5||[]).join(" ")}`);
  }
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
  try { Bots?.update?.(dt); } catch (e) { console.error(e); }

  renderer.render(scene, camera);
});

log("[main] ready ✅");
