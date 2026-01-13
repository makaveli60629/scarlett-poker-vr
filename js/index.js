// /js/index.js — Scarlett FULL XR Runtime v4.9
// ✅ Quest controllers: robust axes via inputSources + navigator.getGamepads fallback
// ✅ Lasers always visible (controller + grip)
// ✅ Smooth locomotion: Left stick move, Right stick turn
// ✅ Teleport press uses gamepad buttons (robust)
// ✅ HUD hide/show + Copy log
// ✅ Android dual-stick remains

import { VRButton } from "./VRButton.js";

const HUD = (() => {
  const state = { lines: [], max: 2500 };
  const el = (tag, css) => { const e = document.createElement(tag); if (css) e.style.cssText = css; return e; };

  const root = el("div", `
    position:fixed; left:10px; top:10px; right:10px;
    max-height:44vh; overflow:auto; z-index:99999;
    padding:12px; border-radius:16px;
    background:rgba(5,6,10,.62); backdrop-filter:blur(10px);
    border:1px solid rgba(127,231,255,.2);
    color:#e8ecff; font-family:system-ui,Segoe UI,Roboto,Arial;
    pointer-events:none;
  `);

  const bar = el("div", `display:flex; gap:10px; align-items:center; margin-bottom:10px; pointer-events:auto; flex-wrap:wrap;`);
  const title = el("div", `font-weight:800; letter-spacing:.2px;`); title.textContent = "Scarlett VR Poker";

  const pill = (txt) => { const p = el("div", `
    padding:6px 10px; border-radius:999px;
    border:1px solid rgba(127,231,255,.18);
    background:rgba(11,13,20,.6);
    font-size:12px; opacity:.95;
  `); p.textContent = txt; return p; };

  const badgeXR = pill("XR: ?");
  const badgeMode = pill("Mode: boot");
  const badgeInput = pill("Input: ?");

  const btn = (txt) => {
    const b = el("button", `
      padding:8px 10px; border-radius:12px;
      border:1px solid rgba(127,231,255,.32);
      background:rgba(11,13,20,.85);
      color:#e8ecff; cursor:pointer;
    `);
    b.textContent = txt;
    b.style.pointerEvents = "auto";
    return b;
  };

  const copyBtn = btn("Copy");
  const clearBtn = btn("Clear");
  const hideBtn = btn("Hide HUD");

  const showBtn = btn("Show HUD");
  showBtn.style.position = "fixed";
  showBtn.style.top = "10px";
  showBtn.style.right = "10px";
  showBtn.style.zIndex = "999999";
  showBtn.style.display = "none";

  const logBox = el("pre", `margin:0; white-space:pre-wrap; word-break:break-word; font-size:13px; line-height:1.25;`);

  bar.appendChild(title);
  bar.appendChild(badgeXR);
  bar.appendChild(badgeMode);
  bar.appendChild(badgeInput);
  bar.appendChild(copyBtn);
  bar.appendChild(clearBtn);
  bar.appendChild(hideBtn);

  root.appendChild(bar);
  root.appendChild(logBox);
  document.body.appendChild(root);
  document.body.appendChild(showBtn);

  function render() { logBox.textContent = state.lines.join("\n"); root.scrollTop = root.scrollHeight; }

  function log(...a) {
    const t = new Date();
    const ts = `[${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}]`;
    state.lines.push(`${ts} ${a.join(" ")}`);
    if (state.lines.length > state.max) state.lines.splice(0, state.lines.length - state.max);
    render();
    console.log(...a);
  }

  function setXR(v){ badgeXR.textContent = `XR: ${v ? "supported" : "no"}`; }
  function setMode(v){ badgeMode.textContent = `Mode: ${v}`; }
  function setInput(v){ badgeInput.textContent = `Input: ${v}`; }

  copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(state.lines.join("\n")); log("[hud] copied ✅"); }
    catch(e){ log("[hud] copy failed:", e?.message||e); }
  };
  clearBtn.onclick = () => { state.lines = []; render(); };

  hideBtn.onclick = () => { root.style.display = "none"; showBtn.style.display = "block"; };
  showBtn.onclick = () => { root.style.display = "block"; showBtn.style.display = "none"; };

  window.addEventListener("error", (e)=>log("[FATAL]", e.message || e.error || e));
  window.addEventListener("unhandledrejection",(e)=>log("[FATAL promise]", e.reason?.message || e.reason || e));

  return { log, setXR, setMode, setInput };
})();

function isTouch() { return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0); }

function installAndroidDualStick() {
  if (!isTouch()) return null;

  const mk = (side) => {
    const root = document.createElement("div");
    root.style.cssText = `
      position:fixed; bottom:18px; ${side==="left" ? "left:18px" : "right:18px"};
      width:160px; height:160px; border-radius:999px;
      border:1px solid rgba(255,255,255,0.18);
      background:rgba(10,12,18,0.25); backdrop-filter:blur(6px);
      touch-action:none; z-index:99999; user-select:none;
      pointer-events:auto;
    `;
    const nub = document.createElement("div");
    nub.style.cssText = `
      position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
      width:64px; height:64px; border-radius:999px;
      background:rgba(127,231,255,0.22);
      border:1px solid rgba(127,231,255,0.45);
      box-shadow:0 0 18px rgba(127,231,255,0.25);
    `;
    root.appendChild(nub);
    document.body.appendChild(root);

    const st = { x:0, y:0, active:false, id:-1, cx:0, cy:0, nub };
    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

    root.addEventListener("pointerdown",(e)=>{
      st.active=true; st.id=e.pointerId;
      const r=root.getBoundingClientRect();
      st.cx=r.left+r.width/2; st.cy=r.top+r.height/2;
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener("pointermove",(e)=>{
      if(!st.active||e.pointerId!==st.id) return;
      const dx=e.clientX-st.cx, dy=e.clientY-st.cy;
      const max=52;
      st.x=clamp(dx/max,-1,1);
      st.y=clamp(dy/max,-1,1);
      st.nub.style.transform=`translate(${st.x*42-50}%, ${st.y*42-50}%)`;
    });
    const end=(e)=>{
      if(e.pointerId!==st.id) return;
      st.active=false; st.id=-1; st.x=0; st.y=0;
      st.nub.style.transform="translate(-50%,-50%)";
    };
    root.addEventListener("pointerup",end);
    root.addEventListener("pointercancel",end);

    return st;
  };

  const left = mk("left");
  const right = mk("right");
  HUD.log("[android] dual-stick ready ✅");
  return { left, right };
}

async function loadTHREE() {
  return await import("https://unpkg.com/three@0.160.0/build/three.module.js");
}

// ✅ Always-visible lasers: attach to both controller and controllerGrip
function installLasers(THREE, renderer, scene) {
  const controllers = [];
  const grips = [];

  const makeLaser = () => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-2.2)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.95 });
    const line = new THREE.Line(geo, mat);
    line.name = "LaserLine";
    return line;
  };

  for (let i=0;i<2;i++){
    const c = renderer.xr.getController(i);
    c.name = `XRController_${i}`;
    c.add(makeLaser());
    scene.add(c);
    controllers.push(c);

    const g = renderer.xr.getControllerGrip(i);
    g.name = `XRGrip_${i}`;
    g.add(makeLaser());
    scene.add(g);
    grips.push(g);
  }

  HUD.log("[xr] lasers installed ✅ (controller + grip)");
  return { controllers, grips };
}

function deadzone(v, dz){ return Math.abs(v) < dz ? 0 : v; }

// Robust pads: inputSources + fallback navigator.getGamepads
function getPads(renderer) {
  const out = { left:null, right:null, any:[], nav:[] };

  const session = renderer.xr.getSession?.();
  if (session) {
    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      out.any.push(src);
      if (src.handedness === "left") out.left = src;
      if (src.handedness === "right") out.right = src;
    }
    if (!out.left && out.any[0]) out.left = out.any[0];
    if (!out.right && out.any[1]) out.right = out.any[1];
  }

  if (navigator.getGamepads) {
    const gps = navigator.getGamepads();
    for (const gp of gps) {
      if (gp && gp.axes && gp.axes.length >= 2) out.nav.push(gp);
    }
  }

  // If WebXR missing, wrap navigator pads
  if (!out.left && out.nav[0]) out.left = { gamepad: out.nav[0], handedness:"left" };
  if (!out.right && out.nav[1]) out.right = { gamepad: out.nav[1], handedness:"right" };

  return out;
}

function bootLoop(THREE, STATE) {
  const { renderer, scene, camera, player, controllers } = STATE;
  const clock = new THREE.Clock();
  let dbgT = 0;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());

    // XR locomotion (Quest)
    if (renderer.xr.isPresenting) {
      const pads = getPads(renderer);
      const lgp = pads.left?.gamepad;
      const rgp = pads.right?.gamepad;

      let mx=0, mz=0, turn=0;
      if (lgp?.axes?.length >= 2) {
        mx = deadzone(lgp.axes[0] || 0, 0.14);
        mz = deadzone(lgp.axes[1] || 0, 0.14);
      }
      if (rgp?.axes?.length >= 2) {
        turn = deadzone(rgp.axes[0] || 0, 0.14);
      }

      const yaw = player.rotation.y;
      const speed = 2.35 * dt;

      // forward/back is mz (Quest forward is typically -1)
      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;

      player.rotation.y -= turn * 2.35 * dt;
      player.position.x += vx;
      player.position.z += vz;

      // debug axes so we KNOW Quest is feeding values
      dbgT += dt;
      if (dbgT > 0.6) {
        dbgT = 0;
        HUD.setInput(`XR L(${(lgp?.axes?.[0]||0).toFixed(2)}, ${(lgp?.axes?.[1]||0).toFixed(2)}) R(${(rgp?.axes?.[0]||0).toFixed(2)})`);
      }

      // pass pads to world (for teleport press)
      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers, pads }, dt);

    } else if (STATE.sticks) {
      // Android
      const mx = STATE.sticks.left?.x || 0;
      const mz = STATE.sticks.left?.y || 0;
      const turn = STATE.sticks.right?.x || 0;

      const yaw = player.rotation.y;
      const speed = 2.1 * dt;

      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;

      player.rotation.y -= turn * 2.1 * dt;
      player.position.x += vx;
      player.position.z += vz;

      HUD.setInput("Touch");
      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers }, dt);
    } else {
      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers }, dt);
    }

    renderer.render(scene, camera);
  });
}

(async function boot() {
  HUD.setMode("booting");
  HUD.setXR(!!navigator.xr);
  HUD.log("[BOOT] booting…");

  let THREE;
  try { THREE = await loadTHREE(); HUD.log("[BOOT] THREE loaded ✅"); }
  catch (e) { HUD.log("[FATAL] THREE load failed:", e?.message || e); HUD.setMode("fatal"); return; }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 10, 75);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 280);
  camera.position.set(0, 1.65, 0);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  try { document.body.appendChild(VRButton.createButton(renderer)); HUD.log("[index] VRButton appended ✅"); }
  catch (e) { HUD.log("[VRButton] failed:", e?.message || e); }

  const sticks = installAndroidDualStick();

  // lasers on both paths
  const laserRig = installLasers(THREE, renderer, scene);
  const controllers = laserRig.controllers;

  let WorldMod;
  try {
    WorldMod = await import("./world.js?v=4_9_full");
    HUD.log("[index] world.js imported ✅");
  } catch (e) {
    HUD.log("[FATAL] world.js import failed:", e?.message || e);
    HUD.setMode("fatal");
    return;
  }

  const World = WorldMod.World;
  if (!World?.build) {
    HUD.log("[FATAL] world.js missing export World.build()");
    HUD.setMode("fatal");
    return;
  }

  try {
    HUD.log("[index] calling world.build() …");
    await World.build({ THREE, scene, renderer, camera, player, controllers, log: HUD.log });
    HUD.log("[world] build complete ✅");
  } catch (e) {
    HUD.log("[FATAL] world.build failed:", e?.message || e);
    HUD.setMode("fatal");
    return;
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  HUD.setMode("running");
  bootLoop(THREE, { THREE, scene, renderer, camera, player, controllers, sticks, World });
  HUD.log("[index] runtime running ✅");
})();
