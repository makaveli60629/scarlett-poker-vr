// /js/scarlett1/index.js
// SCARLETT FULL SAFE DEMO (Quest + Android)
// Build: SCARLETT_FULL_SAFE_v1

const BUILD = "SCARLETT_FULL_SAFE_v1";

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
const app = $("#app");

const t0 = performance.now();
const lines = [];
const stamp = () => ((performance.now() - t0) / 1000).toFixed(3);
function dwrite(msg){
  const s = `[${stamp()}] ${String(msg)}`;
  lines.push(s);
  if (lines.length > 260) lines.shift();
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

// ---- three ----
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
camera.position.set(0, 1.6, 3.2);

const rig = new THREE.Group();
rig.position.set(0, 0, 0);
rig.add(camera);
scene.add(rig);

// lights
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, 0.85);
dir.position.set(4, 8, 3);
scene.add(dir);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, { passive:true });

// ---- world ----
dwrite("[world] buildWorld()");
const world = buildWorld(scene, dwrite);

// ---- HUD ----
btnDiag?.addEventListener("click", () => {
  const on = diagPanel.style.display !== "block";
  diagPanel.style.display = on ? "block" : "none";
});

btnHideHUD?.addEventListener("click", () => {
  const hidden = hud.style.display === "none";
  hud.style.display = hidden ? "flex" : "none";
});

const SPAWN = new THREE.Vector3(0, 0, 3.2);

btnReset?.addEventListener("click", () => {
  rig.position.copy(SPAWN);
  rig.rotation.set(0,0,0);
  camera.rotation.set(0,0,0);
  state.yaw = 0;
  state.pitch = 0;
  dwrite("[player] reset to spawn ✅");
});

const state = {
  teleport: false,
  yaw: 0,
  pitch: 0,
  one: { active:false, x:0, y:0 },
  two: { active:false, ax:0, ay:0, bx:0, by:0, sx:0, sz:0 },
};

btnTeleport?.addEventListener("click", () => {
  state.teleport = !state.teleport;
  btnTeleport.dataset.on = state.teleport ? "1" : "0";
  btnTeleport.textContent = `Teleport: ${state.teleport ? "ON" : "OFF"}`;
  dwrite(`[teleport] ${state.teleport ? "ON" : "OFF"}`);
});

// ---- Android touch controls ----
const el = renderer.domElement;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

el.addEventListener("touchstart", (e) => {
  if (!e.touches || e.touches.length===0) return;

  if (e.touches.length===1){
    const t = e.touches[0];
    state.one.active = true;
    state.one.x = t.clientX;
    state.one.y = t.clientY;
    return;
  }
  if (e.touches.length===2){
    const a = e.touches[0], b = e.touches[1];
    state.two.active = true;
    state.two.ax = a.clientX; state.two.ay = a.clientY;
    state.two.bx = b.clientX; state.two.by = b.clientY;
    state.two.sx = rig.position.x; state.two.sz = rig.position.z;
  }
},{ passive:true });

el.addEventListener("touchmove", (e) => {
  if (!e.touches) return;

  if (state.one.active && e.touches.length===1){
    const t = e.touches[0];
    const dx = t.clientX - state.one.x;
    const dy = t.clientY - state.one.y;
    state.one.x = t.clientX;
    state.one.y = t.clientY;

    const S = 0.0022;
    state.yaw -= dx * S;
    state.pitch -= dy * S;
    state.pitch = clamp(state.pitch, -1.1, 1.1);

    rig.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
    return;
  }

  if (state.two.active && e.touches.length===2){
    const a = e.touches[0], b = e.touches[1];
    const mx0 = (state.two.ax + state.two.bx)*0.5;
    const my0 = (state.two.ay + state.two.by)*0.5;
    const mx1 = (a.clientX + b.clientX)*0.5;
    const my1 = (a.clientY + b.clientY)*0.5;

    const dx = (mx1 - mx0);
    const dy = (my1 - my0);

    const moveScale = 0.008;
    const fwd = -dy * moveScale;
    const str = dx * moveScale;

    const yaw = rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    const vx = (str * cos) + (fwd * sin);
    const vz = (fwd * cos) - (str * sin);

    rig.position.x = state.two.sx + vx;
    rig.position.z = state.two.sz + vz;
  }
},{ passive:true });

el.addEventListener("touchend", (e) => {
  if (!e.touches) return;
  if (e.touches.length===0){
    state.one.active = false;
    state.two.active = false;
  }
  if (e.touches.length===1) state.two.active = false;
},{ passive:true });

// ---- Desktop WASD fallback ----
const keys = new Set();
window.addEventListener("keydown", (e)=>keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e)=>keys.delete(e.key.toLowerCase()));
function applyWASD(dt){
  const speed = 2.2;
  let f=0,s=0;
  if (keys.has("w")) f += 1;
  if (keys.has("s")) f -= 1;
  if (keys.has("a")) s -= 1;
  if (keys.has("d")) s += 1;
  if (!f && !s) return;

  const yaw = rig.rotation.y;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const vx = (s*cos) + (f*sin);
  const vz = (f*cos) - (s*sin);
  rig.position.x += vx * speed * dt;
  rig.position.z += -vz * speed * dt;
}

// ---- VR entry (trusted gesture safe) ----
async function canEnterVR(){
  if (!navigator.xr) return false;
  try { return await navigator.xr.isSessionSupported("immersive-vr"); }
  catch { return false; }
}

btnEnterVR?.addEventListener("click", async () => {
  dwrite("ENTER VR CLICK REGISTERED ✅");

  if (!navigator.xr){
    alert("WebXR not supported");
    return;
  }

  const ok = await canEnterVR();
  if (!ok){
    alert("immersive-vr not supported here");
    dwrite("XR immersive-vr NOT supported ❌");
    return;
  }

  try{
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
    });
    renderer.xr.setSession(session);
    dwrite("XR SESSION STARTED ✅");
    session.addEventListener("end", ()=>dwrite("XR session ended."));
  } catch(e){
    dwrite(`XR SESSION FAILED ❌ ${e?.message || e}`);
    alert("VR blocked by browser/device");
  }
});

// ---- Quest smooth locomotion via gamepad axes ----
function readXRMove(dt){
  const session = renderer.xr.getSession?.();
  if (!session) return;

  for (const src of session.inputSources){
    const gp = src?.gamepad;
    if (!gp) continue;

    const axX = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const axY = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dead = 0.14;
    const sx = Math.abs(axX) > dead ? axX : 0;
    const sy = Math.abs(axY) > dead ? axY : 0;
    if (!sx && !sy) continue;

    // Teleport ON = step forward; OFF = smooth move
    if (state.teleport){
      if ((-sy) > 0.85){
        const step = 0.6;
        const yaw = rig.rotation.y;
        rig.position.x += Math.sin(yaw) * step;
        rig.position.z += Math.cos(yaw) * step;
      }
      continue;
    }

    const speed = 2.0;
    const yaw = rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const fwd = -sy;
    const str = sx;
    const vx = (str*cos) + (fwd*sin);
    const vz = (fwd*cos) - (str*sin);
    rig.position.x += vx * speed * dt;
    rig.position.z += vz * speed * dt;
  }
}

// ---- loop ----
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  applyWASD(dt);
  readXRMove(dt);
  world?.tick?.(dt, { rig, camera });
  renderer.render(scene, camera);
});
