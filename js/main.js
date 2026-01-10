// /js/main.js — Scarlett Poker VR Boot v12.4 (FULL, GitHub Pages safe)
// ✅ Fixes: movement always works (Quest + Android)
// ✅ Fixes: GitHub Pages imports (no "three" bare imports)
// ✅ Keeps: Controls + Teleport + Hands + DealingMix + PokerSim pipeline

import * as THREE from "./three.js";
import { VRButton } from "./VRButton.js";
import { XRControllerModelFactory } from "./XRControllerModelFactory.js";

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

// ---------- TUNING ----------
const GAME = {
  seats: 6,
  startingStack: 20000,
  decisionSecondsPerPlayer: 15,
  approxStreetSeconds() { return this.seats * this.decisionSecondsPerPlayer; },
  tDealHole: 6.0,
  tShowdown: 8.0,
  tNextHand: 4.0,
};

const STREET_SECONDS = Math.max(20, GAME.approxStreetSeconds());
const tFlop = STREET_SECONDS;
const tTurn = STREET_SECONDS;
const tRiver = STREET_SECONDS;

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 6, 120);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);

// VR Button
try {
  document.body.appendChild(VRButton.createButton(renderer));
  log("[main] VRButton appended ✅");
} catch (e) {
  log("❌ VRButton failed: " + (e?.message || e));
}

// ---------- XR tuning ----------
renderer.xr.addEventListener("sessionstart", () => {
  try {
    renderer.setPixelRatio(1.0);
    renderer.xr.setFoveation?.(1.0);
  } catch {}
  log("[xr] sessionstart ✅");
});
renderer.xr.addEventListener("sessionend", () => {
  try { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); } catch {}
  log("[xr] sessionend ✅");
});

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
  const geo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 });
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

// ---------- ANDROID CONTROLS (D-pad + buttons) ----------
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const mob = { up:0, down:0, left:0, right:0, turnL:false, turnR:false };

function bindHold(sel, key){
  const el = document.querySelector(sel);
  if (!el) return;
  const set = (v)=> mob[key]=v;
  el.addEventListener("pointerdown",(e)=>{ e.preventDefault(); set(1); el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointerup",()=> set(0));
  el.addEventListener("pointercancel",()=> set(0));
  el.addEventListener("pointerleave",()=> set(0));
  el.addEventListener("touchstart",(e)=>{ e.preventDefault(); set(1); }, {passive:false});
  el.addEventListener("touchend",(e)=>{ e.preventDefault(); set(0); }, {passive:false});
  el.addEventListener("touchcancel",(e)=>{ e.preventDefault(); set(0); }, {passive:false});
}

// If your index has these IDs/classes, they’ll work. If not, ignore safely.
bindHold("#mUp","up");
bindHold("#mDown","down");
bindHold("#mLeft","left");
bindHold("#mRight","right");

let __mobileAction = null;
let __mobileTeleport = null;
document.getElementById("mAction")?.addEventListener("click", ()=> __mobileAction?.());
document.getElementById("mTeleport")?.addEventListener("click", ()=> __mobileTeleport?.());
document.getElementById("mTurnL")?.addEventListener("click", ()=> { player.rotation.y += Math.PI/10; });
document.getElementById("mTurnR")?.addEventListener("click", ()=> { player.rotation.y -= Math.PI/10; });

// ---------- WORLD ----------
const world = await initWorld({ THREE, scene, log, v: BOOT_V });
window.__world = world;

// For DealingMix facing player
world.cameraRef = camera;

// Provide safe defaults
if (!world.tableFocus) world.tableFocus = new THREE.Vector3(0, 0, -6.5);
if (!world.tableY) world.tableY = 0.92;

// Spawn if world provides
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

// Android action/teleport hooks (camera ray)
__mobileAction = () => world?.clickFromCamera?.?.() ?? teleport?.clickFromCamera?.?.();
__mobileTeleport = () => world?.teleportFromCamera?.?.() ?? teleport?.teleportFromCamera?.?.();

// ---------- DEALING VISUALS ----------
const dealing = DealingMix.init({ THREE, scene, log, world });
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
  startingStack: GAME.startingStack,
  tDealHole: GAME.tDealHole,
  tFlop, tTurn, tRiver,
  tShowdown: GAME.tShowdown,
  tNextHand: GAME.tNextHand,
  toyBetting: true,
  names: ["BOT 1","BOT 2","BOT 3","BOT 4","BOT 5","BOT 6"],
});

poker.on("state", (s) => {
  dealing?.setStreet?.(s.street);
  dealing?.setAction?.(s.actionText || s.phase || "—");
  dealing?.setPot?.(s.pot);
});
poker.on("blinds", (b) => { dealing?.onBlinds?.(b); dealing?.setPot?.(b.pot); });
poker.on("action", (a) => { dealing?.onAction?.(a); });
poker.on("deal", (d) => { dealing?.onDeal?.(d); });
poker.on("showdown", (sd) => { dealing?.onShowdown?.(sd); });
poker.on("finished", (f) => { dealing?.showFinished?.(f); });

poker.startHand();
log("[main] PokerSim started ✅");

// ---------- MOVEMENT FAIL-SAFE (this fixes “I can’t move”) ----------
function getXRLeftAxes(){
  const session = renderer.xr.getSession?.();
  if (!session) return null;
  for (const src of session.inputSources){
    if (src?.handedness !== "left") continue;
    const gp = src.gamepad;
    if (gp?.axes?.length) return gp.axes;
  }
  // fallback: any gamepad axes
  for (const src of session.inputSources){
    const gp = src.gamepad;
    if (gp?.axes?.length) return gp.axes;
  }
  return null;
}

function applyMoveFailsafe(dt){
  const speed = 2.2;
  let mx = 0, my = 0;

  if (renderer.xr.isPresenting){
    const axes = getXRLeftAxes();
    if (axes){
      mx = axes[2] ?? axes[0] ?? 0;
      my = axes[3] ?? axes[1] ?? 0;
    }
  } else if (isMobile){
    my = (mob.up ? 1 : 0) + (mob.down ? -1 : 0);
    mx = (mob.right ? 1 : 0) + (mob.left ? -1 : 0);
  }

  const dead = 0.15;
  if (Math.abs(mx) < dead) mx = 0;
  if (Math.abs(my) < dead) my = 0;
  if (!mx && !my) return;

  const yaw = player.rotation.y;
  const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
  const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

  const v = new THREE.Vector3();
  v.addScaledVector(right, mx);
  v.addScaledVector(forward, my);
  if (v.lengthSq() > 1e-6) v.normalize();

  player.position.addScaledVector(v, speed * dt);
}

// Panic unfreeze
window.addEventListener("keydown",(e)=>{
  if (e.key.toLowerCase()==="p"){
    player.position.y = 0;
    player.position.x += 0.25;
    player.position.z += 0.25;
    log("[panic] nudged player ✅");
  }
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

  // ✅ guaranteed movement first (so you can always move)
  try { applyMoveFailsafe(dt); } catch {}

  try { world?.tick?.(dt); } catch {}
  try { controls?.update?.(dt); } catch {}
  try { teleport?.update?.(dt); } catch {}
  try { poker?.update?.(dt); } catch {}
  try { dealing?.update?.(dt); } catch {}
  try { hands?.update?.(dt); } catch {}

  renderer.render(scene, camera);
});

log("[main] ready ✅");
