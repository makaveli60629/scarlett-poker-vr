// /js/scarlett1/index.js
// SCARLETT DEMO v0.1 (LOCKED)
// Goals: deterministic boot, deterministic spawn, Android sticks, XR-ready teleport.

const BUILD = "SCARLETT_DEMO_v0_1_LOCKED";
const DEMO_LOCKED = true;

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { buildWorld } from "../world.js";

const $ = (s) => document.querySelector(s);

const btnEnterVR = $("#btnEnterVR");
const btnTeleport = $("#btnTeleport");
const btnReset = $("#btnReset");
const btnHideHUD = $("#btnHideHUD");
const btnDiag = $("#btnDiag");
const hud = $("#hud");
const diagPanel = $("#diagPanel");
const diagText = $("#diagText");
const hint = $("#hint");
const sticks = $("#sticks");
const stickMove = $("#stickMove");
const stickTurn = $("#stickTurn");
const app = $("#app");

// ---- Diagnostics (must always work) ----
const t0 = performance.now();
const lines = [];
const stamp = () => ((performance.now() - t0) / 1000).toFixed(3);
function dwrite(msg){
  const s = `[${stamp()}] ${String(msg)}`;
  lines.push(s);
  if (lines.length > 420) lines.shift();
  if (diagText) diagText.textContent = lines.join("\n");
  console.log(s);
}
window.__scarlettDiagWrite = (m) => dwrite(m);

dwrite(`booting… BUILD=${BUILD}`);
dwrite(`href=${location.href}`);
dwrite(`secureContext=${String(window.isSecureContext)}`);
dwrite(`ua=${navigator.userAgent}`);
dwrite(`touch=${("ontouchstart" in window)} maxTouchPoints=${navigator.maxTouchPoints || 0}`);
dwrite(`xr=${String(!!navigator.xr)}`);

navigator.xr?.isSessionSupported?.("immersive-vr")
  ?.then(v => dwrite(`xr immersive-vr supported=${v}`))
  ?.catch(() => dwrite("xr immersive-vr supported=ERROR"));

// ---- Three ----
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);

// Player rig
const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);

// Brighter lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.72));
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, 0.95);
dir.position.set(9, 14, 7);
scene.add(dir);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, { passive:true });

// ---- State ----
const state = {
  teleport: false,
  yaw: Math.PI,
  pitch: 0,
  _tpTarget: null,
  _btnLatch: new Map(),
  // Virtual sticks
  vm: { active:false, id:null, cx:0, cy:0, x:0, y:0 },
  vt: { active:false, id:null, cx:0, cy:0, x:0, y:0 },
  // Android drag-look (optional)
  look: { active:false, id:null, x:0, y:0 },
};

// ---- Spawn (authoritative) ----
// Spawn should face the teaching table (table is centered at z=0).
const SPAWN = new THREE.Vector3(0, 0, 22.0);
function applySpawn(){
  rig.position.copy(SPAWN);
  // IMPORTANT: yaw=0 means camera looks toward -Z (toward the table).
  rig.rotation.set(0, 0, 0);
  state.yaw = 0;
  state.pitch = 0;
  camera.position.set(0, 1.6, 0);
  camera.rotation.set(0,0,0);
}
applySpawn();

// ---- Build world ----
dwrite("[world] buildWorld()");
const world = buildWorld(scene, dwrite);

// Extra point lights (table visibility)
const p1 = new THREE.PointLight(0xffffff, 0.9, 25); p1.position.set(0, 6, 0); scene.add(p1);
const p2 = new THREE.PointLight(0x88ffff, 0.8, 18); p2.position.set(-6, 4, -6); scene.add(p2);
const p3 = new THREE.PointLight(0x88ffff, 0.8, 18); p3.position.set( 6, 4,  6); scene.add(p3);

// ---- HUD ----
btnDiag?.addEventListener("click", () => {
  diagPanel.style.display = (diagPanel.style.display === "block") ? "none" : "block";
});
btnHideHUD?.addEventListener("click", () => {
  const on = hud.style.display !== "none";
  hud.style.display = on ? "none" : "flex";
  if (sticks) sticks.style.display = on ? "none" : "block";
  if (hint) hint.style.display = on ? "none" : "block";
  if (!on) diagPanel.style.display = "none";
});
btnReset?.addEventListener("click", () => {
  applySpawn();
  dwrite("[player] reset to spawn ✅");
});
function setTeleport(on){
  state.teleport = !!on;
  btnTeleport.dataset.on = state.teleport ? "1" : "0";
  btnTeleport.textContent = `Teleport: ${state.teleport ? "ON" : "OFF"}`;
  dwrite(`[teleport] ${state.teleport ? "ON" : "OFF"}`);
}
btnTeleport?.addEventListener("click", () => setTeleport(!state.teleport));

// ---- Virtual Sticks (Android) ----
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

function attachStick(el, key){
  if (!el) return;
  const knob = el.querySelector(".stickKnob");

  const onDown = (e) => {
    if (!e.isPrimary && e.pointerType !== "touch") return;
    el.setPointerCapture?.(e.pointerId);
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width*0.5;
    const cy = r.top + r.height*0.5;
    state[key].active = true;
    state[key].id = e.pointerId;
    state[key].cx = cx;
    state[key].cy = cy;
    state[key].x = 0;
    state[key].y = 0;
    if (knob) knob.style.transition = "none";
  };

  const onMove = (e) => {
    if (!state[key].active || state[key].id !== e.pointerId) return;
    const r = el.getBoundingClientRect();
    const radius = Math.min(r.width, r.height) * 0.35;
    const dx = e.clientX - state[key].cx;
    const dy = e.clientY - state[key].cy;
    const nx = clamp(dx / radius, -1, 1);
    const ny = clamp(dy / radius, -1, 1);
    state[key].x = nx;
    state[key].y = ny;
    if (knob){
      knob.style.transform = `translate3d(${(nx*radius)*0.55}px, ${(ny*radius)*0.55}px, 0)`;
    }
  };

  const onUp = (e) => {
    if (!state[key].active || state[key].id !== e.pointerId) return;
    state[key].active = false;
    state[key].id = null;
    state[key].x = 0;
    state[key].y = 0;
    if (knob){
      knob.style.transition = "transform 120ms ease";
      knob.style.transform = "translate3d(0,0,0)";
    }
  };

  el.addEventListener("pointerdown", onDown, { passive:true });
  window.addEventListener("pointermove", onMove, { passive:true });
  window.addEventListener("pointerup", onUp, { passive:true });
  window.addEventListener("pointercancel", onUp, { passive:true });
}
attachStick(stickMove, "vm");
attachStick(stickTurn, "vt");

// Optional drag-look (only when NOT touching stick zones)
const elCanvas = renderer.domElement;
elCanvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch") return;
  const t = e.target;
  if (t === stickMove || stickMove?.contains(t) || t === stickTurn || stickTurn?.contains(t)) return;
  state.look.active = true;
  state.look.id = e.pointerId;
  state.look.x = e.clientX;
  state.look.y = e.clientY;
}, { passive:true });
window.addEventListener("pointermove", (e) => {
  if (!state.look.active || state.look.id !== e.pointerId) return;
  const dx = e.clientX - state.look.x;
  const dy = e.clientY - state.look.y;
  state.look.x = e.clientX;
  state.look.y = e.clientY;

  const S = 0.0020;
  state.yaw -= dx * S;
  state.pitch -= dy * S;
  state.pitch = clamp(state.pitch, -1.1, 1.1);

  rig.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
}, { passive:true });
window.addEventListener("pointerup", (e) => {
  if (state.look.id !== e.pointerId) return;
  state.look.active = false;
  state.look.id = null;
}, { passive:true });

// ---- VR controllers: laser + reticle + teleport ----
// NOTE: Some headsets report controller(0) as LEFT; others as RIGHT.
// We create both controllers and only show lasers when the controller is actually connected/tracked.
const tmpMat4 = new THREE.Matrix4();
const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
const laserGeom = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0,0,0),
  new THREE.Vector3(0,0,-1)
]);

function makeController(i){
  const c = renderer.xr.getController(i);
  c.userData.connected = false;
  c.addEventListener("connected", () => { c.userData.connected = true; dwrite(`[xr] controller${i} connected ✅`); });
  c.addEventListener("disconnected", () => { c.userData.connected = false; dwrite(`[xr] controller${i} disconnected`); });
  const line = new THREE.Line(laserGeom, laserMat);
  line.scale.z = 12;
  line.visible = false;
  c.add(line);
  c.userData.laserLine = line;
  scene.add(c);
  return c;
}

const ctl0 = makeController(0);
const ctl1 = makeController(1);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.12, 0.17, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.9, side:THREE.DoubleSide })
);
reticle.rotation.x = -Math.PI/2;
reticle.visible = false;
scene.add(reticle);

function tryTeleport(){
  if (!state.teleport) return;
  const p = state._tpTarget;
  if (!p) return;
  rig.position.x = p.x;
  rig.position.z = p.z;
  dwrite(`[teleport] moved to x=${p.x.toFixed(2)} z=${p.z.toFixed(2)}`);
}

ctl0.addEventListener("selectstart", tryTeleport);
ctl1.addEventListener("selectstart", tryTeleport);

function edgeButton(key, pressed){
  const prev = state._btnLatch.get(key) || false;
  state._btnLatch.set(key, !!pressed);
  return (!prev && !!pressed);
}

function readXRMoveAndButtons(dt){
  const session = renderer.xr.getSession?.();
  if (!session) return;

  for (const src of session.inputSources){
    const gp = src?.gamepad;
    if (!gp) continue;

    // Buttons: make teleport toggle reliable across Quest/Oculus mappings.
    const b0 = gp.buttons?.[0]?.pressed; // A / X
    const b1 = gp.buttons?.[1]?.pressed; // B / Y
    const b3 = gp.buttons?.[3]?.pressed; // stick press (often)
    const b4 = gp.buttons?.[4]?.pressed; // (sometimes) X/Y
    const b5 = gp.buttons?.[5]?.pressed; // (sometimes) A/B
    if (
      edgeButton(`${src.handedness}:b0`, b0) ||
      edgeButton(`${src.handedness}:b1`, b1) ||
      edgeButton(`${src.handedness}:b3`, b3) ||
      edgeButton(`${src.handedness}:b4`, b4) ||
      edgeButton(`${src.handedness}:b5`, b5)
    ){
      setTeleport(!state.teleport);
    }

    // Axes mapping varies by browser:
    // - Per-controller sticks often come in as [0],[1] for THAT controller.
    // - Some combined mappings expose a "right stick" at [2],[3].
    const lx = gp.axes?.[0] ?? 0;
    const ly = gp.axes?.[1] ?? 0;
    const turnAxis = (src.handedness === "right")
      ? (gp.axes?.[0] ?? 0)                 // right controller stick X
      : (gp.axes?.[2] ?? gp.axes?.[0] ?? 0); // combined right-stick X OR fallback

    const dead = 0.14;
    const Lx = Math.abs(lx) > dead ? lx : 0;
    const Ly = Math.abs(ly) > dead ? ly : 0;
    const Rx = Math.abs(turnAxis) > dead ? turnAxis : 0;

    // Turn: right hand preferred, but some browsers only report one gamepad.
    if (!state.teleport && Math.abs(Rx) > 0){
      state.yaw -= Rx * 2.4 * dt;
      rig.rotation.y = state.yaw;
    }

    // Move: prefer left-handed inputSource, but fall back if handedness is unknown.
    if (state.teleport) continue;
    if (src.handedness !== "left" && src.handedness !== "none" && src.handedness !== "") continue;

    if (!Lx && !Ly) continue;
    const fwd = -Ly; // FIX: up=forward on Quest
    const str = Lx;

    const speed = 2.7;
    const yaw = rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const vx = (str*cos) + (fwd*sin);
    const vz = (fwd*cos) - (str*sin);

    rig.position.x += vx * speed * dt;
    rig.position.z += vz * speed * dt;
  }
}

// ---- Enter VR (hard-hide DOM to avoid hood overlay) ----
async function canEnterVR(){
  if (!navigator.xr) return false;
  try { return await navigator.xr.isSessionSupported("immersive-vr"); }
  catch { return false; }
}

function hideAllDomForXR(){
  try{
    if (hud) hud.style.display = "none";
    if (hint) hint.style.display = "none";
    if (sticks) sticks.style.display = "none";
    if (diagPanel) diagPanel.style.display = "none";
  } catch(_){ }
}
function showDomAfterXR(){
  try{
    if (hud) hud.style.display = "flex";
    if (hint) hint.style.display = "block";
    if (sticks && ("ontouchstart" in window)) sticks.style.display = "block";
  } catch(_){ }
}

btnEnterVR?.addEventListener("click", async () => {
  dwrite("ENTER VR CLICK REGISTERED ✅");

  if (!navigator.xr){
    alert("WebXR not supported");
    return;
  }

  const ok = await canEnterVR();
  if (!ok){
    alert("immersive-vr not supported here.");
    dwrite("XR immersive-vr NOT supported ❌");
    return;
  }

  try{
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
    });
    renderer.xr.setSession(session);
    dwrite("XR SESSION STARTED ✅");

    // Apply spawn AFTER XR starts (authoritative)
    applySpawn();

    hideAllDomForXR();

    session.addEventListener("end", () => {
      dwrite("XR session ended.");
      showDomAfterXR();
    });
  } catch(e){
    dwrite(`XR SESSION FAILED ❌ ${e?.message || e}`);
    alert("VR blocked by browser/device");
  }
});

// ---- Main loop ----
const clock = new THREE.Clock();

function applyAndroidSticks(dt){
  // Only when not in XR
  if (renderer.xr.getSession?.()) return;

  // Turn (right stick)
  const turn = state.vt.x;
  if (Math.abs(turn) > 0.08){
    state.yaw -= turn * 2.4 * dt; // rad/s
    rig.rotation.y = state.yaw;
  }

  // Move (left stick)
  const mx = state.vm.x;
  const my = state.vm.y;

  const dead = 0.10;
  const sx = Math.abs(mx) > dead ? mx : 0;
  const sy = Math.abs(my) > dead ? my : 0;
  if (!sx && !sy) return;

  if (state.teleport) return;

  const fwd = -sy;
  const str = sx;

  const speed = 3.1;
  const yaw = rig.rotation.y;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const vx = (str*cos) + (fwd*sin);
  const vz = (fwd*cos) - (str*sin);

  rig.position.x += vx * speed * dt;
  rig.position.z += vz * speed * dt;
}

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  const session = renderer.xr.getSession?.();
  const inXR = !!session;

  if (inXR){
    readXRMoveAndButtons(dt);

    // Pick an aiming controller: prefer a connected right-hand controller.
    const aim = (ctl1.userData.connected ? ctl1 : (ctl0.userData.connected ? ctl0 : null));

    // Only show lasers when controllers are actually connected/tracked.
    if (ctl0.userData.laserLine) ctl0.userData.laserLine.visible = !!ctl0.userData.connected && state.teleport;
    if (ctl1.userData.laserLine) ctl1.userData.laserLine.visible = !!ctl1.userData.connected && state.teleport;

    if (state.teleport && aim){
      // Teleport aim (intersect with y=0 plane)
      tmpMat4.identity().extractRotation(aim.matrixWorld);
      const dir = new THREE.Vector3(0,0,-1).applyMatrix4(tmpMat4).normalize();
      const origin = new THREE.Vector3().setFromMatrixPosition(aim.matrixWorld);

      const denom = dir.y;
      if (Math.abs(denom) > 1e-4){
        const tHit = (0 - origin.y) / denom;
        if (Number.isFinite(tHit) && tHit > 0){
          const hit = origin.clone().add(dir.multiplyScalar(tHit));
          state._tpTarget = hit;

          reticle.visible = true;
          reticle.position.set(hit.x, 0.02, hit.z);

          const dist = origin.distanceTo(hit);
          if (aim.userData.laserLine) aim.userData.laserLine.scale.z = Math.min(20, Math.max(2, dist));
        } else {
          reticle.visible = false;
          state._tpTarget = null;
          if (aim.userData.laserLine) aim.userData.laserLine.scale.z = 12;
        }
      } else {
        reticle.visible = false;
        state._tpTarget = null;
        if (aim.userData.laserLine) aim.userData.laserLine.scale.z = 12;
      }
    } else {
      reticle.visible = false;
      state._tpTarget = null;
      if (ctl0.userData.laserLine) ctl0.userData.laserLine.scale.z = 12;
      if (ctl1.userData.laserLine) ctl1.userData.laserLine.scale.z = 12;
    }
  } else {
    // DEMO LOCK: Android sticks are the official locomotion
    applyAndroidSticks(dt);
    reticle.visible = false;
    if (ctl0.userData.laserLine) ctl0.userData.laserLine.visible = false;
    if (ctl1.userData.laserLine) ctl1.userData.laserLine.visible = false;
  }

  world?.tick?.(dt);
  renderer.render(scene, camera);
});
