// /js/index.js — Scarlett FAILSAFE FULL (Update 4.8.6)
// ✅ No bare "three" import (CDN load)
// ✅ Always-on HUD log + Copy/Clear + Hide/Show (HUD never blocks sticks)
// ✅ VRButton always appended if possible
// ✅ Shows fatal errors on-screen (no silent black)

import { VRButton } from "./VRButton.js";
await import("./world.js?v=4_8_6_failsafe");
// ---- HUD logger (always visible) ----
const HUD = (() => {
  const state = { lines: [], max: 2000 };

  function el(tag, css) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    return e;
  }

  const root = el("div", `
    position:fixed; left:10px; top:10px; right:10px;
    max-height:44vh; overflow:auto; z-index:99999;
    padding:12px; border-radius:16px;
    background:rgba(5,6,10,.62); backdrop-filter:blur(10px);
    border:1px solid rgba(127,231,255,.2);
    color:#e8ecff; font-family:system-ui,Segoe UI,Roboto,Arial;
    pointer-events:none;
  `);

  const bar = el("div", `
    display:flex; gap:10px; align-items:center; margin-bottom:10px;
    pointer-events:auto;
  `);

  const title = el("div", `font-weight:700;`);
  title.textContent = "Scarlett VR Poker";

  const pill = (txt) => {
    const p = el("div", `
      padding:6px 10px; border-radius:999px;
      border:1px solid rgba(127,231,255,.18);
      background:rgba(11,13,20,.6);
      font-size:12px; opacity:.95;
    `);
    p.textContent = txt;
    return p;
  };

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

  const badges = el("div", `display:flex; gap:8px; flex-wrap:wrap; align-items:center;`);
  const badgeXR = pill("XR: ?");
  const badgeMode = pill("Mode: loading");
  badges.appendChild(badgeXR);
  badges.appendChild(badgeMode);

  const logBox = el("pre", `
    margin:0; white-space:pre-wrap; word-break:break-word;
    font-size:13px; line-height:1.25;
  `);

  bar.appendChild(title);
  bar.appendChild(badges);
  bar.appendChild(copyBtn);
  bar.appendChild(clearBtn);
  bar.appendChild(hideBtn);

  root.appendChild(bar);
  root.appendChild(logBox);
  document.body.appendChild(root);
  document.body.appendChild(showBtn);

  function render() {
    logBox.textContent = state.lines.join("\n");
    root.scrollTop = root.scrollHeight;
  }

  function log(...a) {
    const t = new Date();
    const ts = `[${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}]`;
    state.lines.push(`${ts} ${a.join(" ")}`);
    if (state.lines.length > state.max) state.lines.splice(0, state.lines.length - state.max);
    render();
    console.log(...a);
  }

  function setXR(supported) {
    badgeXR.textContent = `XR: ${supported ? "supported" : "no"}`;
  }

  function setMode(txt) {
    badgeMode.textContent = `Mode: ${txt}`;
  }

  function setHidden(v) {
    root.style.display = v ? "none" : "block";
    showBtn.style.display = v ? "block" : "none";
  }

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(state.lines.join("\n"));
      log("[hud] copied ✅");
    } catch (e) {
      log("[hud] copy failed:", e?.message || e);
    }
  };

  clearBtn.onclick = () => {
    state.lines = [];
    render();
  };

  hideBtn.onclick = () => setHidden(true);
  showBtn.onclick = () => setHidden(false);

  // global error surfaces
  window.addEventListener("error", (e) => {
    log("[FATAL]", e.message || e.error || e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    log("[FATAL promise]", e.reason?.message || e.reason || e);
  });

  return { log, setXR, setMode };
})();

// ---- Android dual stick (simple; HUD does not block touches) ----
function installAndroidDualStick() {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return null;

  const mk = (side) => {
    const root = document.createElement("div");
    root.style.cssText = `
      position:fixed; bottom:18px; ${side === "left" ? "left:18px" : "right:18px"};
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

// ---- Three.js loader (CDN; no bare imports) ----
async function loadTHREE() {
  // You can pin versions if you want. This is stable.
  const url = "https://unpkg.com/three@0.160.0/build/three.module.js";
  return await import(url);
}

// ---- XR controller lasers ----
function installControllerRays(THREE, renderer, scene) {
  const controllers = [];
  for (let i=0;i<2;i++){
    const c = renderer.xr.getController(i);
    c.name = `XRController_${i}`;
    scene.add(c);
    controllers.push(c);

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1.6)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.9 });
    c.add(new THREE.Line(geo, mat));
  }
  HUD.log("[index] controller rays installed ✅ (laser only)");
  return controllers;
}

// ---- XR + Android locomotion ----
function deadzone(v, dz) { return Math.abs(v) < dz ? 0 : v; }

function getXRGamepads(renderer) {
  const session = renderer.xr.getSession?.();
  if (!session) return { left:null, right:null };
  let left = null, right = null;
  for (const src of session.inputSources) {
    if (!src?.gamepad) continue;
    if (src.handedness === "left") left = src;
    if (src.handedness === "right") right = src;
  }
  return { left, right };
}

function bootLoop(THREE, STATE) {
  const { renderer, scene, camera, player, controllers } = STATE;
  const clock = new THREE.Clock();

  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, clock.getDelta());

    // locomotion
    if (renderer.xr.isPresenting) {
      const pads = getXRGamepads(renderer);
      const lgp = pads.left?.gamepad;
      const rgp = pads.right?.gamepad;

      let mx=0, mz=0, turn=0;
      if (lgp?.axes?.length >= 2) {
        mx = deadzone(lgp.axes[0] || 0, 0.14);
        mz = deadzone(lgp.axes[1] || 0, 0.14);
        // IMPORTANT: Quest axes[1] typically: forward = -1, back = +1
        // This is correct as-is.
      }
      if (rgp?.axes?.length >= 2) {
        turn = deadzone(rgp.axes[0] || 0, 0.14);
      }

      const yaw = player.rotation.y;
      const speed = 2.2 * dt;
      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;

      player.rotation.y -= turn * 2.2 * dt;
      player.position.x += vx;
      player.position.z += vz;
    } else if (STATE.sticks) {
      const mx = STATE.sticks.left?.x || 0;
      const mz = STATE.sticks.left?.y || 0;
      const turn = STATE.sticks.right?.x || 0;

      const yaw = player.rotation.y;
      const speed = 2.0 * dt;
      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;

      player.rotation.y -= turn * 2.0 * dt;
      player.position.x += vx;
      player.position.z += vz;
    }

    // world frame
    STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers }, dt);

    renderer.render(scene, camera);
  });
}

// ---- MAIN BOOT ----
(async function boot() {
  HUD.log("[BOOT] booting…");
  HUD.setMode("booting");

  // XR support badge
  HUD.setXR(!!navigator.xr);

  // Load THREE
  let THREE;
  try {
    THREE = await loadTHREE();
    HUD.log("[BOOT] THREE loaded ✅");
  } catch (e) {
    HUD.log("[FATAL] THREE load failed:", e?.message || e);
    HUD.setMode("fatal");
    return;
  }

  // Basic scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 10, 65);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 250);
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

  // VR button
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    HUD.log("[index] VRButton appended ✅");
  } catch (e) {
    HUD.log("[VRButton] failed:", e?.message || e);
  }

  // touch sticks
  const sticks = installAndroidDualStick();

  // controllers + rays
  const controllers = installControllerRays(THREE, renderer, scene);

  // Load world with cache-bust so you ALWAYS get latest
  let WorldMod;
  try {
    WorldMod = await import("./world.js?v=4_8_6_failsafe");
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

  // Build world
  try {
    HUD.log("[index] calling world.build() …");
    await World.build({ THREE, scene, renderer, camera, player, controllers, log: HUD.log });
    HUD.log("[world] build complete ✅");
  } catch (e) {
    HUD.log("[FATAL] world.build failed:", e?.message || e);
    HUD.setMode("fatal");
    return;
  }

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Start loop
  HUD.setMode("running");
  bootLoop(THREE, { THREE, scene, renderer, camera, player, controllers, sticks, World });

  HUD.log("[index] runtime running ✅");
})();
