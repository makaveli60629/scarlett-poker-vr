// /js/scarlett1/index.js
// SCARLETT PATCH v4 (Fix spawn in XR, invert stick, add teleport toggle on controller buttons, reduce XR hood overlay)
// Build: SCARLETT_PATCH_v4

const BUILD = "SCARLETT_PATCH_v4";

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
  if (lines.length > 380) lines.shift();
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
  yaw: 0,
  pitch: 0,
  one: { active:false, x:0, y:0 },
  two: { active:false, ax:0, ay:0, bx:0, by:0, sx:0, sz:0 },
  _tpTarget: null,
  _btnLatch: new Map(),
};

// ---- Spawn ----
const SPAWN = new THREE.Vector3(0, 0, 24.0);
function applySpawn(){
  rig.position.copy(SPAWN);
  rig.rotation.y = Math.PI;
  state.yaw = Math.PI;
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
const p3 = new THREE.PointLight(0x88ffff, 0.8, 18); p3.position.set(6, 4, 6); scene.add(p3);

// ---- HUD ----
btnDiag?.addEventListener("click", () => {
  diagPanel.style.display = (diagPanel.style.display === "block") ? "none" : "block";
});
btnHideHUD?.addEventListener("click", () => {
  hud.style.display = (hud.style.display === "none") ? "flex" : "none";
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

    const moveScale = 0.010;
    const fwd = -dy * moveScale;
    const str = dx * moveScale;

    const yaw = rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);

    const vx = (str*cos) + (fwd*sin);
    const vz = (fwd*cos) - (str*sin);

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

// ---- Desktop WASD ----
const keys = new Set();
window.addEventListener("keydown", (e)=>keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e)=>keys.delete(e.key.toLowerCase()));
function applyWASD(dt){
  const speed = 3.0;
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

// ---- VR controllers: laser + reticle + teleport ----
const tmpMat4 = new THREE.Matrix4();
const ctlR = renderer.xr.getController(0);
scene.add(ctlR);

const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
const laserGeom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
const laserLine = new THREE.Line(laserGeom, laserMat);
laserLine.scale.z = 12;
ctlR.add(laserLine);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.12, 0.17, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.9, side:THREE.DoubleSide })
);
reticle.rotation.x = -Math.PI/2;
reticle.visible = false;
scene.add(reticle);

// Trigger (select) teleports in teleport mode
ctlR.addEventListener("selectstart", () => {
  if (!state.teleport) return;
  const p = state._tpTarget;
  if (!p) return;
  rig.position.x = p.x;
  rig.position.z = p.z;
  dwrite(`[teleport] moved to x=${p.x.toFixed(2)} z=${p.z.toFixed(2)}`);
});

// Edge detection for controller buttons
function edgeButton(key, pressed){
  const prev = state._btnLatch.get(key) || false;
  state._btnLatch.set(key, !!pressed);
  return (!prev && !!pressed);
}

// XR move + teleport toggle
function readXRMoveAndButtons(dt){
  const session = renderer.xr.getSession?.();
  if (!session) return;

  for (const src of session.inputSources){
    const gp = src?.gamepad;
    if (!gp) continue;

    // Toggle teleport on A/X or B/Y (buttons 4/5)
    const b4 = gp.buttons?.[4]?.pressed;
    const b5 = gp.buttons?.[5]?.pressed;
    if (edgeButton(`${src.handedness}:b4`, b4) || edgeButton(`${src.handedness}:b5`, b5)){
      setTeleport(!state.teleport);
    }

    // Use left hand stick for movement
    if (src.handedness !== "left") continue;

    const axX = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const axY = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dead = 0.14;
    const sx = Math.abs(axX) > dead ? axX : 0;
    const sy = Math.abs(axY) > dead ? axY : 0;
    if (!sx && !sy) continue;

    if (state.teleport) continue;

    // FIX: your report says forward/back are swapped -> invert
    const fwd = -sy;
    const str = sx;

    const speed = 2.7;
    const yaw = rig.rotation.y;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const vx = (str*cos) + (fwd*sin);
    const vz = (fwd*cos) - (str*sin);

    rig.position.x += vx * speed * dt;
    rig.position.z += vz * speed * dt;
  }
}

// Enter VR: hide DOM overlay to reduce hood effect
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
    alert("immersive-vr not supported here (Android expected).");
    dwrite("XR immersive-vr NOT supported ❌");
    return;
  }

  try{
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor","bounded-floor","hand-tracking"]
    });
    renderer.xr.setSession(session);
    dwrite("XR SESSION STARTED ✅");

    // Apply spawn AFTER XR starts (fix: headset origin starts at table)
    applySpawn();

    // Hide DOM overlay
    try{
      $("#hud").style.display = "none";
      const hint = $("#hint"); if (hint) hint.style.display = "none";
      const dp = $("#diagPanel"); if (dp) dp.style.display = "none";
    } catch(_){}

    session.addEventListener("end", () => {
      dwrite("XR session ended.");
      try{
        $("#hud").style.display = "flex";
        const hint = $("#hint"); if (hint) hint.style.display = "block";
      } catch(_){}
    });
  } catch(e){
    dwrite(`XR SESSION FAILED ❌ ${e?.message || e}`);
    alert("VR blocked by browser/device");
  }
});

// ---- Loop ----
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  applyWASD(dt);

  const session = renderer.xr.getSession?.();
  const inXR = !!session;

  if (inXR){
    readXRMoveAndButtons(dt);

    // Laser always visible in XR
    laserLine.visible = true;

    if (state.teleport){
      // Teleport aim (intersect with y=0 plane)
      tmpMat4.identity().extractRotation(ctlR.matrixWorld);
      const dir = new THREE.Vector3(0,0,-1).applyMatrix4(tmpMat4).normalize();
      const origin = new THREE.Vector3().setFromMatrixPosition(ctlR.matrixWorld);

      const denom = dir.y;
      if (Math.abs(denom) > 1e-4){
        const tHit = (0 - origin.y) / denom;
        if (Number.isFinite(tHit) && tHit > 0){
          const hit = origin.clone().add(dir.multiplyScalar(tHit));
          state._tpTarget = hit;

          reticle.visible = true;
          reticle.position.set(hit.x, 0.02, hit.z);

          const dist = origin.distanceTo(hit);
          laserLine.scale.z = Math.min(20, Math.max(2, dist));
        } else {
          reticle.visible = false;
          state._tpTarget = null;
          laserLine.scale.z = 12;
        }
      } else {
        reticle.visible = false;
        state._tpTarget = null;
        laserLine.scale.z = 12;
      }
    } else {
      reticle.visible = false;
      state._tpTarget = null;
      laserLine.scale.z = 12;
    }
  } else {
    reticle.visible = false;
    laserLine.visible = false;
  }

  world?.tick?.(dt, { rig, camera });
  renderer.render(scene, camera);
});
