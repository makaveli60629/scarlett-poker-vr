import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import { createWorld, createLowPolyAvatar, applyClothing } from "./world.js";
import { createSafeModuleLoader } from "./module_loader.js";

// --- UI refs
const ui = {
  grid: document.getElementById("diagGrid"),
  logBox: document.getElementById("logBox"),
  capXR: document.getElementById("capXR"),
  capImm: document.getElementById("capImm"),
};

const LOG = {
  lines: [],
  max: 300,
  push(kind, msg){
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${kind.toUpperCase()}: ${msg}`;
    this.lines.push(line);
    if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
    if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
    (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
  },
  clear(){ this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
  copy(){
    const text = this.lines.join("\n");
    navigator.clipboard?.writeText?.(text).then(
      () => this.push("log", "Copied logs ✅"),
      () => this.push("warn", "Clipboard copy failed.")
    );
  }
};

addEventListener("error", (e)=> LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
addEventListener("unhandledrejection", (e)=>{
  const reason = e.reason instanceof Error ? (e.reason.stack || e.reason.message) : String(e.reason);
  LOG.push("error", `UnhandledPromiseRejection: ${reason}`);
});

setInterval(()=> {
  const c = document.getElementById("clock");
  if (c) c.textContent = new Date().toLocaleString();
}, 250);

// --- helpers
function toggleMenu() {
  const el = document.getElementById("menu-frame");
  el.style.display = (el.style.display === "none" || !el.style.display) ? "block" : "none";
}
window.gameAction = (type) => {
  if (type === "muck") LOG.push("log", "Boss MUCK: hides losing hand (info control).");
  if (type === "show") LOG.push("log", "Boss SHOW: reveals hand (intimidation).");
  document.getElementById("menu-frame").style.display = "none";
};

// --- scene state
let scene, camera, renderer, labelRenderer, playerAvatar;
let ctx = null;

// --- animation registry
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const anims = [];
function addAnim(fn){ anims.push(fn); }
function tickAnims(t){
  for (let i = anims.length - 1; i >= 0; i--) {
    const alive = anims[i](t);
    if (!alive) anims.splice(i, 1);
  }
}

// --- Cards
const cards = { group:null, dealerAnchor:null, dealt:false };

function makeCardMesh() {
  const geo = new THREE.PlaneGeometry(0.065, 0.09);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  m.add(edge);
  return m;
}

function getDealerWorldPos(out) {
  if (cards.dealerAnchor) return cards.dealerAnchor.getWorldPosition(out);
  out.set(0, 1.0, -0.35);
  return out;
}

function getFallbackHandTarget(out, handedness) {
  camera.getWorldPosition(out);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0);
  out.add(forward.multiplyScalar(0.35));
  out.add(up.multiplyScalar(-0.25));
  out.add(right.multiplyScalar(handedness === "left" ? -0.12 : 0.12));
  return out;
}
function getHandTarget(out, handedness) {
  const hand = handedness === "left" ? playerAvatar.leftHand : playerAvatar.rightHand;
  if (!hand) return getFallbackHandTarget(out, handedness);
  hand.getWorldPosition(out);
  if (out.lengthSq() < 0.0001) return getFallbackHandTarget(out, handedness);
  return out;
}

function dealHoleCards() {
  if (!cards.group) {
    cards.group = new THREE.Group();
    cards.group.name = "Cards";
    scene.add(cards.group);
  }
  while (cards.group.children.length) cards.group.remove(cards.group.children[0]);

  const p0 = getDealerWorldPos(new THREE.Vector3());
  const c1 = makeCardMesh();
  const c2 = makeCardMesh();
  c1.position.copy(p0); c2.position.copy(p0);
  c1.position.x -= 0.01;
  c2.position.x += 0.01;
  cards.group.add(c1, c2);

  const startT = performance.now();
  const dur = 560;
  const lift = 0.22;

  const fly = (card, side) => addAnim((tNow) => {
    const u = Math.min(1, (tNow - startT) / dur);
    const from = getDealerWorldPos(tmpV.set(0,0,0)).clone();
    const to = getHandTarget(tmpV2.set(0,0,0), side).clone();
    const mid = from.clone().lerp(to, 0.5); mid.y += lift;
    const a = from.clone().lerp(mid, u);
    const b = mid.clone().lerp(to, u);
    const pos = a.lerp(b, u);

    card.position.copy(pos);
    card.quaternion.copy(camera.quaternion);
    card.rotateX(-Math.PI / 2);
    card.rotateZ(side === "left" ? -0.25 : 0.25);
    return u < 1;
  });

  fly(c1, "left");
  fly(c2, "right");
  LOG.push("log", "Dealt 2 hole cards ✅");
}

// --- XR Hands
function handleHandTracking(frame) {
  const session = renderer.xr.getSession();
  if (!session) return;
  const refSpace = renderer.xr.getReferenceSpace();

  for (const inputSource of session.inputSources) {
    if (!inputSource.hand) continue;
    const wrist = inputSource.hand.get("wrist");
    if (!wrist) continue;
    const pose = frame.getPose(wrist, refSpace);
    if (!pose) continue;

    const handMesh = inputSource.handedness === "left" ? playerAvatar.leftHand : playerAvatar.rightHand;
    handMesh.position.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    );
    handMesh.quaternion.set(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );
  }
}

// --- Diagnostics metrics
let last = performance.now();
let fpsAcc = 0, fpsCount = 0, fps = 0;

function setMetrics(rows){
  if (!ui.grid) return;
  ui.grid.innerHTML = "";
  for (const [k,v] of rows){
    const row = document.createElement("div");
    row.className = "kv";
    const kk = document.createElement("div");
    kk.className = "k";
    kk.textContent = k;
    const vv = document.createElement("div");
    vv.className = "v";
    vv.textContent = v;
    row.appendChild(kk);
    row.appendChild(vv);
    ui.grid.appendChild(row);
  }
}

async function setCaps(){
  const xr = !!navigator.xr;
  ui.capXR.textContent = xr ? "YES" : "NO";
  let immersive = false;
  try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
  ui.capImm.textContent = immersive ? "YES" : "NO";
}

// --- Buttons
document.getElementById("btnMenu").onclick = () => toggleMenu();
document.getElementById("btnDeal").onclick = () => dealHoleCards();
document.getElementById("btnClear").onclick = () => LOG.clear();
document.getElementById("btnCopy").onclick = () => LOG.copy();

addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "m") toggleMenu();
  if (k === "d") dealHoleCards();
});

// --- Init
async function init() {
  await setCaps();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  const vrBtn = VRButton.createButton(renderer, { optionalFeatures: ["hand-tracking","local-floor"] });
  vrBtn.id = "VRButton";
  document.body.appendChild(vrBtn);

  // Labels
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = "fixed";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelRenderer.domElement.style.zIndex = "999995";
  document.body.appendChild(labelRenderer.domElement);

  createWorld(scene);
  cards.dealerAnchor = scene.getObjectByName("DealerAnchor") || null;

  playerAvatar = createLowPolyAvatar();
  scene.add(playerAvatar);
  applyClothing(playerAvatar, "assets/textures/clothing_diffuse.png");

  // Nametag
  const tagEl = document.createElement("div");
  tagEl.className = "nametag-container";
  tagEl.innerHTML = `BOSS<span class="nametag-sub">Pinch to Bet • Fist to Show</span>`;
  const tagObj = new CSS2DObject(tagEl);
  playerAvatar.headAnchor.add(tagObj);

  // XR hands (three.js)
  const hands = {
    left: renderer.xr.getHand(0),
    right: renderer.xr.getHand(1),
  };
  scene.add(hands.left, hands.right);

  // Safe module loader
  const modLog = (kind, msg) => LOG.push(kind === "error" ? "error" : kind === "warn" ? "warn" : "log", msg);
  const Modules = createSafeModuleLoader({ log: modLog });
  const V = new URLSearchParams(location.search).get("v") || Date.now();

  // CONTINUE ADDING MODULES HERE FOREVER
  const MODULE_MANIFEST = [
    { name: "GestureEngine", url: `./GestureEngineModule.js?v=${V}`, required: true },
    { name: "Betting", url: `./BettingModule.js?v=${V}`, required: true },
    { name: "Jumbotron", url: `./JumbotronModule.js?v=${V}`, required: false },
  ];

  // Shared context for every module
  ctx = {
    THREE, scene, camera, renderer, labelRenderer,
    LOG,
    hands,
    playerAvatar,
    dealHoleCards,
    toggleMenu,
    cards,
    wallet: { chips: 5000 },
    bets: { bears: 0, packers: 0 },
  };

  await Modules.loadAll(MODULE_MANIFEST, ctx);

  // Hook spawn chips button AFTER module init
  document.getElementById("btnSpawnChips").onclick = () => {
    const betting = Modules.get("Betting");
    if (!betting?.spawnChipSet) {
      LOG.push("warn", "BettingModule.spawnChipSet missing");
      return;
    }
    const origin = new THREE.Vector3(0, 0.82, -0.65); // in front of table
    betting.spawnChipSet(ctx, origin);
  };

  // XR session hooks
  renderer.xr.addEventListener("sessionstart", () => {
    LOG.push("log", "XR session started ✅");
    setTimeout(() => dealHoleCards(), 220);
  });
  renderer.xr.addEventListener("sessionend", () => LOG.push("warn", "XR session ended"));

  window.addEventListener("resize", onWindowResize);

  // Loop
  renderer.setAnimationLoop((timestamp, frame) => render(timestamp, frame, Modules));
  LOG.push("log", "Init complete ✅ (Update 5.4 permanent)");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame, Modules) {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  fpsAcc += dt; fpsCount++;
  if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

  if (frame) {
    handleHandTracking(frame);
    // torso follows head yaw
    const torso = playerAvatar.getObjectByName("Torso");
    if (torso) torso.rotation.y = camera.rotation.y;
    // avatar follows camera
    playerAvatar.position.set(camera.position.x, camera.position.y - 1.6, camera.position.z);
  }

  tickAnims(performance.now());

  // module updates
  try { Modules.updateAll(dt, ctx); } catch (e) { LOG.push("warn", `Modules.updateAll error: ${e?.message || e}`); }

  // module counts
  const rep = Modules.getReport();
  const ok = rep.filter(r=>r.status==="ok").length;
  const warn = rep.filter(r=>r.status==="warn").length;
  const fail = rep.filter(r=>r.status==="fail").length;

  setMetrics([
    ["FPS", `${fps}`],
    ["XR", renderer.xr.isPresenting ? "ON" : "OFF"],
    ["Session", renderer.xr.getSession() ? "active" : "none"],
    ["Cards", cards.group ? `${cards.group.children.length} in scene` : "none"],
    ["Wallet", `${ctx.wallet?.chips ?? 0} chips`],
    ["Bears Bet", `${ctx.bets?.bears ?? 0}`],
    ["Modules", `${ok} ok • ${warn} warn • ${fail} fail`],
  ]);

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

init();
