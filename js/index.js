import * as THREE from "three";
import { createWorld, createLowPolyAvatar, applyClothing } from "./world.js";
import { createSafeModuleLoader } from "./module_loader.js";

// ---------- VRButton failsafe ----------
let VRButton = null;

async function loadVRButton() {
  try {
    const mod = await import("three/addons/webxr/VRButton.js");
    VRButton = mod.VRButton;
    return { ok: true, via: "three/addons/webxr/VRButton.js" };
  } catch (e1) {
    try {
      const mod = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
      VRButton = mod.VRButton;
      return { ok: true, via: "unpkg examples/jsm/webxr/VRButton.js" };
    } catch (e2) {
      return { ok: false, e1, e2 };
    }
  }
}

// ---------- HUD + logs ----------
const ui = {
  grid: document.getElementById("diagGrid"),
  logBox: document.getElementById("logBox"),
  capXR: document.getElementById("capXR"),
  capImm: document.getElementById("capImm"),
};

const LOG = {
  lines: [],
  max: 280,
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

function setMetrics(rows){
  if (!ui.grid) return;
  ui.grid.innerHTML = "";
  for (const [k,v] of rows){
    const row = document.createElement("div");
    row.className = "kv";
    const kk = document.createElement("div"); kk.className = "k"; kk.textContent = k;
    const vv = document.createElement("div"); vv.className = "v"; vv.textContent = v;
    row.appendChild(kk); row.appendChild(vv);
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

// ---------- Menu ----------
function toggleMenu() {
  const el = document.getElementById("menu-frame");
  el.style.display = (el.style.display === "none" || !el.style.display) ? "block" : "none";
}
window.gameAction = (type) => {
  if (type === "muck") LOG.push("log", "Boss MUCK.");
  if (type === "show") LOG.push("log", "Boss SHOW.");
  document.getElementById("menu-frame").style.display = "none";
};

// Buttons
document.getElementById("btnMenu").onclick = () => toggleMenu();
document.getElementById("btnClear").onclick = () => LOG.clear();
document.getElementById("btnCopy").onclick = () => LOG.copy();
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "m") toggleMenu();
  if (k === "d") dealHoleCards();
});

// ---------- Scene / XR ----------
let scene, camera, renderer, playerAvatar, labelRenderer;
let ctx = null;

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

// Cards (simple deal)
const cards = { group:null, dealerAnchor:null };

function makeCardMesh() {
  const geo = new THREE.PlaneGeometry(0.065, 0.09);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
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
    scene.add(cards.group);
  }
  while (cards.group.children.length) cards.group.remove(cards.group.children[0]);

  const p0 = getDealerWorldPos(new THREE.Vector3());
  const c1 = makeCardMesh();
  const c2 = makeCardMesh();
  c1.position.copy(p0); c2.position.copy(p0);
  c1.position.x -= 0.01; c2.position.x += 0.01;
  cards.group.add(c1, c2);

  const startT = performance.now();
  const dur = 560, lift = 0.22;

  const fly = (card, side) => addAnim((tNow) => {
    const u = Math.min(1, (tNow - startT) / dur);
    const from = getDealerWorldPos(tmpV.set(0,0,0)).clone();
    const to = getHandTarget(tmpV2.set(0,0,0), side).clone();
    const mid = from.clone().lerp(to, 0.5); mid.y += lift;
    const a = from.clone().lerp(mid, u);
    const b = mid.clone().lerp(to, u);
    card.position.copy(a.lerp(b, u));
    card.quaternion.copy(camera.quaternion);
    card.rotateX(-Math.PI/2);
    card.rotateZ(side === "left" ? -0.25 : 0.25);
    return u < 1;
  });

  fly(c1, "left");
  fly(c2, "right");
  LOG.push("log", "Deal ✅");
}
document.getElementById("btnDeal").onclick = () => dealHoleCards();

// Hand tracking (wrist pose -> placeholders)
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
    handMesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
    handMesh.quaternion.set(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );
  }
}

// VRButton attach (with manual fallback)
async function attachVRButton() {
  const res = await loadVRButton();
  if (!res.ok) {
    LOG.push("error", "VRButton import FAILED.");
    LOG.push("error", `Importmap error: ${res.e1?.message || res.e1}`);
    LOG.push("error", `Unpkg error: ${res.e2?.message || res.e2}`);

    if (navigator.xr) {
      const btn = document.createElement("button");
      btn.id = "VRButton";
      btn.textContent = "ENTER VR (Fallback)";
      btn.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:999999;padding:12px 14px;border-radius:14px;font-weight:900;";
      btn.onclick = async () => {
        try {
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
          });
          renderer.xr.setSession(session);
          LOG.push("log", "Fallback XR session started ✅");
        } catch (e) {
          LOG.push("error", `Fallback requestSession failed: ${e?.message || e}`);
        }
      };
      document.body.appendChild(btn);
      LOG.push("warn", "Using fallback VR button.");
      return;
    }

    LOG.push("error", "navigator.xr not available — cannot create fallback VR button.");
    return;
  }

  const btn = VRButton.createButton(renderer, { optionalFeatures: ["local-floor","bounded-floor","hand-tracking"] });
  btn.id = "VRButton";
  document.body.appendChild(btn);
  LOG.push("log", `VRButton appended ✅ via ${res.via}`);
}

// Main init
let last = performance.now();
let fpsAcc=0, fpsCount=0, fps=0;

async function init() {
  await setCaps();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 2.8);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Build world (this is your real world file in /js/world.js)
  createWorld(scene);
  cards.dealerAnchor = scene.getObjectByName("DealerAnchor") || null;

  // Avatar
  playerAvatar = createLowPolyAvatar();
  scene.add(playerAvatar);
  applyClothing(playerAvatar, "assets/textures/clothing_diffuse.png"); // keep your assets rule

  await attachVRButton();

  // Safe modules (in /js/)
  const modLog = (kind, msg) => LOG.push(kind === "error" ? "error" : kind === "warn" ? "warn" : "log", msg);
  const Modules = createSafeModuleLoader({ log: modLog });
  const V = new URLSearchParams(location.search).get("v") || Date.now();

  const hands = { left: renderer.xr.getHand(0), right: renderer.xr.getHand(1) };
  scene.add(hands.left, hands.right);

  ctx = {
    THREE, scene, camera, renderer,
    LOG,
    hands,
    playerAvatar,
    dealHoleCards,
    toggleMenu,
    wallet: { chips: 5000 },
    bets: { bears: 0, packers: 0 },
  };

  const MODULE_MANIFEST = [
    { name: "GestureEngine", url: `./GestureEngineModule.js?v=${V}`, required: false },
    { name: "Haptics",      url: `./HapticModule.js?v=${V}`,       required: false },
    { name: "Betting",      url: `./BettingModule.js?v=${V}`,      required: false },
    { name: "Jumbotron",    url: `./JumbotronModule.js?v=${V}`,    required: false },
  ];

  await Modules.loadAll(MODULE_MANIFEST, ctx);

  // Spawn chips button (only if Betting loaded)
  document.getElementById("btnSpawnChips").onclick = () => {
    const betting = Modules.get("Betting");
    if (!betting?.spawnChipSet) return LOG.push("warn", "BettingModule not loaded (or no spawnChipSet)");
    betting.spawnChipSet(ctx, new THREE.Vector3(0, 0.82, -0.65));
  };

  renderer.xr.addEventListener("sessionstart", () => {
    LOG.push("log", "XR session started ✅");
    setTimeout(() => dealHoleCards(), 220);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop((timestamp, frame) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    if (frame) {
      handleHandTracking(frame);
      const torso = playerAvatar.getObjectByName("Torso");
      if (torso) torso.rotation.y = camera.rotation.y;
      playerAvatar.position.set(camera.position.x, camera.position.y - 1.6, camera.position.z);
    }

    tickAnims(performance.now());
    Modules.updateAll(dt, ctx);

    const rep = Modules.getReport();
    const ok = rep.filter(r=>r.status==="ok").length;
    const warn = rep.filter(r=>r.status==="warn").length;
    const fail = rep.filter(r=>r.status==="fail").length;

    setMetrics([
      ["FPS", `${fps}`],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["World", cards.dealerAnchor ? "DealerAnchor OK" : "DealerAnchor missing"],
      ["Wallet", `${ctx.wallet?.chips ?? 0}`],
      ["Bears Bet", `${ctx.bets?.bears ?? 0}`],
      ["Modules", `${ok} ok • ${warn} warn • ${fail} fail`],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log", "Boot ✅ (JS layout)");
}

init();
