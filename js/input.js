// /js/index.js — Scarlett Runtime v9.5 ULT (FULL)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const pad = (n) => String(n).padStart(2, "0");
const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

const out = [];
function log(m) {
  const line = `[${now()}] ${m}`;
  out.push(line);
  console.log(line);
  const el = document.getElementById("hud-log");
  if (el) el.textContent = out.slice(-260).join("\n");
  if (typeof window.__HTML_LOG === "function") { try { window.__HTML_LOG(line); } catch {} }
}
function setStatus(t) { if (typeof window.__SET_BOOT_STATUS === "function") { try { window.__SET_BOOT_STATUS(t); } catch {} } }

log(`[index] runtime start ✅ base=${window.SCARLETT_BASE || "/"}`);
setStatus("index init…");

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.flags = window.SCARLETT.flags || { safeMode:false, poker:true, bots:true, fx:true };
window.SCARLETT.botsSpeed = window.SCARLETT.botsSpeed ?? 1.0;
window.SCARLETT.botsPaused = window.SCARLETT.botsPaused ?? false;
window.SCARLETT.botsStep = false;

const UI = window.SCARLETT_UI || {};

// ---------- Renderer / Scene / Camera ----------
const app = document.getElementById("app") || document.body;
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 600);
camera.position.set(0, 1.6, 2);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

// fallback lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(3,8,4); scene.add(dir);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- VR Button ----------
try { document.body.appendChild(VRButton.createButton(renderer)); log("[index] VRButton appended ✅"); }
catch (e) { log(`[index] VRButton failed ❌ ${e?.message || String(e)}`); }

// Manual Enter VR
document.getElementById("enterVrBtn")?.addEventListener("click", async () => {
  try {
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const sessionInit = { optionalFeatures: ["local-floor","bounded-floor","hand-tracking","layers","dom-overlay"], domOverlay: { root: document.body } };
    const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
    renderer.xr.setSession(session);
    log("[index] manual XR session start ✅");
  } catch (e) {
    log(`[index] manual XR failed ❌ ${e?.message || String(e)}`);
  }
});

// ---------- Controllers + Lasers ----------
const controllers = {
  left: null, right: null,
  grips: { left:null, right:null },
  lines: { left:null, right:null },
  raycaster: new THREE.Raycaster(),
  tmpMat: new THREE.Matrix4(),
  stick: { lx:0, ly:0, rx:0, ry:0 },
  snapReady: true
};

function makeLaserLine() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const mat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.9 });
  const line = new THREE.Line(geo, mat);
  line.name = "XR_LASER";
  line.scale.z = 10;
  return line;
}

function setupXRControllers() {
  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);
  controllers.lines.left = makeLaserLine();
  controllers.lines.right = makeLaserLine();
  controllers.left.add(controllers.lines.left);
  controllers.right.add(controllers.lines.right);
  scene.add(controllers.left);
  scene.add(controllers.right);

  controllers.grips.left = renderer.xr.getControllerGrip(0);
  controllers.grips.right = renderer.xr.getControllerGrip(1);
  scene.add(controllers.grips.left);
  scene.add(controllers.grips.right);

  controllers.left.addEventListener("selectstart", (e)=>onSelectStart(e,"left"));
  controllers.right.addEventListener("selectstart", (e)=>onSelectStart(e,"right"));

  log("[xr] controllers + lasers installed ✅");
}

function worldRootForRaycast() {
  return scene.getObjectByName("WORLD_ROOT") || scene;
}

function getRayHit(hand) {
  const ctrl = hand === "left" ? controllers.left : controllers.right;
  if (!ctrl) return null;

  controllers.tmpMat.identity().extractRotation(ctrl.matrixWorld);
  controllers.raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
  controllers.raycaster.ray.direction.set(0,0,-1).applyMatrix4(controllers.tmpMat);

  const root = worldRootForRaycast();
  const hits = controllers.raycaster.intersectObjects(root.children, true);
  for (const h of hits) {
    if (h.object?.name === "XR_LASER") continue;
    if (h.object?.userData?.noRay) continue;
    return h;
  }
  return null;
}

function updateLasers() {
  ["left","right"].forEach((hand)=>{
    const line = hand==="left" ? controllers.lines.left : controllers.lines.right;
    if (!line) return;
    const hit = getRayHit(hand);
    const dist = hit ? hit.distance : 10;
    line.scale.z = Math.max(0.3, Math.min(25, dist));
  });
}

function onSelectStart(e, hand) {
  const hit = getRayHit(hand);
  if (hit?.object?.userData?.onSelect) {
    try { hit.object.userData.onSelect({ hand, hit, event: e }); } catch {}
  }
}

// VR hooks
renderer.xr.addEventListener("sessionstart", () => {
  log("[xr] sessionstart ✅");
  setupXRControllers();
  UI.setXR?.("xr: ON");
});
renderer.xr.addEventListener("sessionend", () => { log("[xr] sessionend ✅"); UI.setXR?.("xr: OFF"); });
UI.setXR?.(`xr: ${renderer.xr.isPresenting ? "ON" : "OFF"}`);

// ---------- VR locomotion ----------
function sampleGamepads() {
  controllers.stick.lx = controllers.stick.ly = controllers.stick.rx = controllers.stick.ry = 0;
  const session = renderer.xr.getSession?.();
  if (!session) return;
  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.axes) continue;
    const ax0 = gp.axes[0] ?? 0, ax1 = gp.axes[1] ?? 0, ax2 = gp.axes[2] ?? 0, ax3 = gp.axes[3] ?? 0;
    if (src.handedness === "left") {
      controllers.stick.lx = ax0; controllers.stick.ly = ax1;
      controllers.stick.rx = ax2; controllers.stick.ry = ax3;
    } else if (src.handedness === "right") {
      controllers.stick.rx = ax0; controllers.stick.ry = ax1;
    } else {
      controllers.stick.lx = ax0; controllers.stick.ly = ax1;
      controllers.stick.rx = ax2; controllers.stick.ry = ax3;
    }
  }
}

function applyVRLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;
  sampleGamepads();

  const dz = 0.15;
  const lx = Math.abs(controllers.stick.lx) > dz ? controllers.stick.lx : 0;
  const ly = Math.abs(controllers.stick.ly) > dz ? controllers.stick.ly : 0;
  const rx = Math.abs(controllers.stick.rx) > dz ? controllers.stick.rx : 0;

  const speed = 2.2;
  if (lx || ly) {
    const dir = new THREE.Vector3(lx, 0, ly);
    const eul = new THREE.Euler(0,0,0,"YXZ"); eul.setFromQuaternion(camera.quaternion);
    dir.applyAxisAngle(new THREE.Vector3(0,1,0), eul.y);
    dir.multiplyScalar(speed * dt);
    player.position.add(dir);
  }

  const snap = 30 * (Math.PI/180);
  if (Math.abs(rx) < 0.35) controllers.snapReady = true;
  if (controllers.snapReady && Math.abs(rx) >= 0.6) {
    player.rotation.y += (rx > 0 ? -snap : snap);
    controllers.snapReady = false;
  }
}

// ---------- Android Dual Stick ----------
const mobile = {
  mode: "auto", // auto|on|off
  move: { x:0, y:0 },
  look: { x:0, y:0 },
  yaw: 0,
  pitch: 0
};
const isTouch = (window.SCARLETT_DIAG?.touch) ?? (("ontouchstart" in window) || (navigator.maxTouchPoints>0));
const stickL = document.getElementById("stickL");
const stickR = document.getElementById("stickR");

function showSticks(show) {
  if (!stickL || !stickR) return;
  stickL.style.display = show ? "block" : "none";
  stickR.style.display = show ? "block" : "none";
  UI.setMobileTag?.(show ? "MOBILE: sticks ON" : "MOBILE: sticks OFF");
}

function applyStickBehavior(el, which) {
  const knob = el.querySelector(".knob");
  const state = { active:false, id:null, cx:0, cy:0 };

  const setKnob = (dx, dy) => {
    const max = 54;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / max);
    const nx = (dx / len) * (max * k);
    const ny = (dy / len) * (max * k);
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    return { x: nx / max, y: ny / max };
  };
  const reset = () => {
    knob.style.transform = `translate(0px, 0px)`;
    if (which === "move") { mobile.move.x = 0; mobile.move.y = 0; }
    if (which === "look") { mobile.look.x = 0; mobile.look.y = 0; }
  };

  el.addEventListener("pointerdown", (e) => {
    if (renderer.xr.isPresenting) return;
    state.active = true; state.id = e.pointerId;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    state.cx = r.left + r.width/2;
    state.cy = r.top + r.height/2;
    reset();
  });

  el.addEventListener("pointermove", (e) => {
    if (!state.active || e.pointerId !== state.id) return;
    const dx = e.clientX - state.cx;
    const dy = e.clientY - state.cy;
    const v = setKnob(dx, dy);
    if (which === "move") { mobile.move.x = v.x; mobile.move.y = v.y; }
    if (which === "look") { mobile.look.x = v.x; mobile.look.y = v.y; }
  });

  el.addEventListener("pointerup", (e) => {
    if (e.pointerId !== state.id) return;
    state.active = false; state.id = null;
    reset();
  });
}

applyStickBehavior(stickL, "move");
applyStickBehavior(stickR, "look");

const mobileSticksBtn = document.getElementById("mobileSticksBtn");
function updateMobileModeUI() {
  mobileSticksBtn.textContent = `Sticks: ${mobile.mode.toUpperCase()}`;
}
mobileSticksBtn?.addEventListener("click", () => {
  mobile.mode = (mobile.mode === "auto") ? "on" : (mobile.mode === "on" ? "off" : "auto");
  updateMobileModeUI();
  const show = (mobile.mode === "on") || (mobile.mode === "auto" && isTouch);
  showSticks(show);
});
updateMobileModeUI();
showSticks(isTouch);

// keyboard fallback
const keys = new Set();
window.addEventListener("keydown",(e)=>keys.add(e.key.toLowerCase()));
window.addEventListener("keyup",(e)=>keys.delete(e.key.toLowerCase()));

function applyNonVRMovement(dt) {
  if (renderer.xr.isPresenting) return;

  const lookSpeed = 2.0;
  if (isTouch) {
    mobile.yaw -= mobile.look.x * lookSpeed * dt;
    mobile.pitch -= mobile.look.y * lookSpeed * dt;
    mobile.pitch = Math.max(-1.2, Math.min(1.2, mobile.pitch));
  }
  player.rotation.y = mobile.yaw;
  camera.rotation.x = mobile.pitch;

  const move = new THREE.Vector3(0,0,0);
  const speed = keys.has("shift") ? 4.3 : 2.2;

  if (keys.has("w")) move.z -= 1;
  if (keys.has("s")) move.z += 1;
  if (keys.has("a")) move.x -= 1;
  if (keys.has("d")) move.x += 1;

  if (isTouch) {
    move.x += mobile.move.x;
    move.z += mobile.move.y;
  }
  if (keys.has("q")) move.y -= 1;
  if (keys.has("e")) move.y += 1;

  if (move.lengthSq() > 0) {
    move.normalize();
    const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion); fwd.y=0; fwd.normalize();
    const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion); right.y=0; right.normalize();
    const dir = new THREE.Vector3();
    dir.addScaledVector(right, move.x);
    dir.addScaledVector(fwd, -move.z);
    dir.y += move.y;
    dir.multiplyScalar(speed * dt);
    player.position.add(dir);
  }
}

// ---------- HUD Buttons (safe/room/bots) ----------
const safeModeBtn = document.getElementById("safeModeBtn");
safeModeBtn.textContent = `SafeMode: ${window.SCARLETT.flags.safeMode ? "ON" : "OFF"}`;
safeModeBtn?.addEventListener("click", () => {
  window.SCARLETT.flags.safeMode = !window.SCARLETT.flags.safeMode;
  safeModeBtn.textContent = `SafeMode: ${window.SCARLETT.flags.safeMode ? "ON" : "OFF"}`;
  log(`[ui] safeMode=${window.SCARLETT.flags.safeMode} (reload to fully disable systems)`);
});

document.querySelectorAll("[data-room]")?.forEach(btn => {
  btn.addEventListener("click", () => {
    const room = btn.getAttribute("data-room");
    worldApi?.setRoom?.(room);
  });
});

document.getElementById("dumpBtn")?.addEventListener("click", () => {
  const dump = {
    base: window.SCARLETT_BASE,
    diag: window.SCARLETT_DIAG,
    flags: window.SCARLETT.flags,
    botsSpeed: window.SCARLETT.botsSpeed,
    botsPaused: window.SCARLETT.botsPaused,
    pos: { x:player.position.x, y:player.position.y, z:player.position.z },
    rotY: player.rotation.y
  };
  log(`[dump] ${JSON.stringify(dump)}`);
});

const botsPauseBtn = document.getElementById("botsPauseBtn");
const botsStepBtn = document.getElementById("botsStepBtn");
const botsSlowerBtn = document.getElementById("botsSlowerBtn");
const botsFasterBtn = document.getElementById("botsFasterBtn");

function syncBotsUI() {
  botsPauseBtn.textContent = `Bots: ${window.SCARLETT.botsPaused ? "PAUSE" : "RUN"}`;
  UI.setBots?.(`botsSpeed: ${window.SCARLETT.botsSpeed.toFixed(2)}  paused=${window.SCARLETT.botsPaused}`);
}
botsPauseBtn?.addEventListener("click", () => {
  window.SCARLETT.botsPaused = !window.SCARLETT.botsPaused;
  syncBotsUI();
});
botsStepBtn?.addEventListener("click", () => {
  window.SCARLETT.botsStep = true;
  window.SCARLETT.botsPaused = true;
  syncBotsUI();
});
botsSlowerBtn?.addEventListener("click", () => {
  window.SCARLETT.botsSpeed = Math.max(0.10, window.SCARLETT.botsSpeed - 0.25);
  syncBotsUI();
});
botsFasterBtn?.addEventListener("click", () => {
  window.SCARLETT.botsSpeed = Math.min(5.00, window.SCARLETT.botsSpeed + 0.25);
  syncBotsUI();
});
syncBotsUI();

// ---------- World Load ----------
let worldApi = null;

(async () => {
  try {
    setStatus("loading world…");
    log("[index] importing + init world…");

    worldApi = await World.init?.({
      THREE, scene, renderer, camera, player,
      controllers,
      log,
      BUILD: Date.now(),
      flags: window.SCARLETT.flags
    });

    log("[index] world init ✅");
    setStatus("ready");
    UI.setHealth?.("OK");
  } catch (e) {
    log(`[index] world init FAILED ❌ ${e?.message || String(e)}`);
    setStatus("world failed ❌");
    UI.setHealth?.("WORLD_FAIL");
  }
})();

// ---------- Loop / Perf ----------
let frames = 0, lastFpsT = performance.now();
let last = performance.now();

renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  try {
    applyNonVRMovement(dt);
    applyVRLocomotion(dt);
    if (renderer.xr.isPresenting) updateLasers();

    const speed = window.SCARLETT.botsSpeed ?? 1.0;

    // Pause/step logic (bots are driven by world tick)
    let tickDt = dt * speed;
    if (window.SCARLETT.botsPaused) tickDt = 0;
    if (window.SCARLETT.botsStep) { tickDt = dt * speed; window.SCARLETT.botsStep = false; }

    worldApi?.tick?.(tickDt);

    UI.setPos?.(`pos: ${player.position.x.toFixed(2)},${player.position.y.toFixed(2)},${player.position.z.toFixed(2)}`);
    UI.setRoom?.(worldApi?.room || "lobby");

    frames++;
    if (t - lastFpsT > 500) {
      const fps = Math.round(frames * 1000 / (t - lastFpsT));
      frames = 0; lastFpsT = t;
      UI.setPerf?.(`fps: ${fps}`);
    }
  } catch (e) {
    log(`[index] loop error ❌ ${e?.message || String(e)}`);
    UI.setHealth?.("LOOP_ERR");
  }

  renderer.render(scene, camera);
});
