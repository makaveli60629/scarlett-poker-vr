// /js/index.js — Scarlett XR Locomotion FIX v5.4.1 (FULL)
// ✅ HUD Copy/Clear/Hide (HUD never blocks inputs)
// ✅ THREE from CDN
// ✅ Controllers + lasers parented to PlayerRig
// ✅ Robust Quest inputSources detection (handles null handedness)
// ✅ Left stick move, Right stick turn
// ✅ Fallback movement if axes missing (buttons / d-pad)
// ✅ Passes pads to world.frame for teleport A/X

import { VRButton } from "./VRButton.js";

const HUD = (() => {
  const state = { lines: [], max: 2500 };

  const el = (tag, css) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    return e;
  };

  const root = el("div", `
    position:fixed; left:10px; top:10px; right:10px;
    max-height:46vh; overflow:auto; z-index:99999;
    padding:12px; border-radius:16px;
    background:rgba(5,6,10,.62); backdrop-filter:blur(10px);
    border:1px solid rgba(127,231,255,.2);
    color:#e8ecff; font-family:system-ui,Segoe UI,Roboto,Arial;
    pointer-events:none;
  `);

  const bar = el("div", `
    display:flex; gap:10px; align-items:center; margin-bottom:10px;
    pointer-events:auto; flex-wrap:wrap;
  `);

  const title = el("div", `font-weight:900; letter-spacing:.2px;`);
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

  const logBox = el("pre", `
    margin:0; white-space:pre-wrap; word-break:break-word;
    font-size:13px; line-height:1.25;
  `);

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

  copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(state.lines.join("\n")); log("[hud] copied ✅"); }
    catch (e) { log("[hud] copy failed:", e?.message || e); }
  };
  clearBtn.onclick = () => { state.lines = []; render(); };
  hideBtn.onclick = () => { root.style.display="none"; showBtn.style.display="block"; };
  showBtn.onclick = () => { root.style.display="block"; showBtn.style.display="none"; };

  window.addEventListener("error", (e)=>log("[FATAL]", e.message || e.error || e));
  window.addEventListener("unhandledrejection", (e)=>log("[FATAL promise]", e.reason?.message || e.reason || e));

  return {
    log,
    setXR:(supported)=>badgeXR.textContent = `XR: ${supported ? "supported" : "no"}`,
    setMode:(txt)=>badgeMode.textContent = `Mode: ${txt}`,
    setInput:(txt)=>badgeInput.textContent = `Input: ${txt}`
  };
})();

async function loadTHREE(){
  return await import("https://unpkg.com/three@0.160.0/build/three.module.js");
}

function installLasers(THREE, renderer, player, HUD){
  const controllers=[];
  const makeLaser=()=>{
    const geo=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-2.2)
    ]);
    const mat=new THREE.LineBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.95 });
    const line=new THREE.Line(geo, mat);
    line.name="LaserLine";
    return line;
  };
  for(let i=0;i<2;i++){
    const c=renderer.xr.getController(i);
    c.name=`XRController_${i}`;
    c.add(makeLaser());
    player.add(c);
    controllers.push(c);
  }
  HUD.log("[xr] lasers installed ✅ (rig-parented)");
  return controllers;
}

function deadzone(v,dz){ return Math.abs(v)<dz?0:v; }

// Most reliable mapping: walk session.inputSources, fall back to any gamepads we see.
// Some Quest builds don't label handedness consistently.
function pickXRGamepads(renderer){
  const session = renderer.xr.getSession?.();
  const out = { leftGp:null, rightGp:null };
  if(!session) return out;

  const gps = [];
  for(const src of session.inputSources){
    if(src?.gamepad) gps.push({ gp:src.gamepad, hand:src.handedness || "" });
  }

  // Prefer by handedness
  out.leftGp  = gps.find(x=>x.hand==="left")?.gp || null;
  out.rightGp = gps.find(x=>x.hand==="right")?.gp || null;

  // If missing, just assign first two gamepads in stable order
  if(!out.leftGp) out.leftGp = gps[0]?.gp || null;
  if(!out.rightGp) out.rightGp = gps[1]?.gp || out.leftGp || null;

  return out;
}

function axesOrFallback(gp){
  // Returns {mx,mz,turn, debug}
  if(!gp) return { mx:0, mz:0, turn:0, dbg:"gp=null" };

  const ax = gp.axes || [];
  const btn = gp.buttons || [];

  // Default stick mapping
  let mx = (ax.length>=2) ? (ax[0]||0) : 0;
  let mz = (ax.length>=2) ? (ax[1]||0) : 0;

  // If axes are missing/zeroed, use buttons as fallback
  // D-pad: 12 up, 13 down, 14 left, 15 right (not always present)
  if(ax.length < 2 || (Math.abs(mx)+Math.abs(mz) < 0.01)){
    const up    = !!btn[12]?.pressed;
    const down  = !!btn[13]?.pressed;
    const left  = !!btn[14]?.pressed;
    const right = !!btn[15]?.pressed;
    mx = (right?1:0) - (left?1:0);
    mz = (down?1:0) - (up?1:0);
    return { mx, mz, turn:0, dbg:`fallbackBtns ax=${ax.length} btn=${btn.length}` };
  }

  mx = deadzone(mx, 0.14);
  mz = deadzone(mz, 0.14);
  return { mx, mz, turn:0, dbg:`axes ax=${ax.length} btn=${btn.length}` };
}

function bootLoop(THREE, STATE, HUD){
  const { renderer, scene, camera, player, controllers } = STATE;
  const clock = new THREE.Clock();
  let dbgT = 0;

  renderer.setAnimationLoop(()=>{
    const dt = Math.min(0.05, clock.getDelta());

    if(renderer.xr.isPresenting){
      const pads = pickXRGamepads(renderer);
      const lgp = pads.leftGp;
      const rgp = pads.rightGp;

      const L = axesOrFallback(lgp);
      const R = axesOrFallback(rgp);

      // Right stick turn if available
      let turn = 0;
      if(rgp?.axes?.length >= 2) turn = deadzone(rgp.axes[0] || 0, 0.14);

      const yaw = player.rotation.y;
      const speed = 2.15 * dt;

      // Apply turn
      player.rotation.y -= turn * 2.15 * dt;

      // Apply movement
      const mx = L.mx;
      const mz = L.mz;

      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;

      player.position.x += vx;
      player.position.z += vz;

      dbgT += dt;
      if(dbgT > 0.85){
        dbgT = 0;
        HUD.setInput(`XR move:${L.dbg} turn:${(rgp?.axes?.length>=2)?"axes":"none"} L(${(lgp?.axes?.[0]||0).toFixed(2)},${(lgp?.axes?.[1]||0).toFixed(2)}) R(${(rgp?.axes?.[0]||0).toFixed(2)},${(rgp?.axes?.[1]||0).toFixed(2)})`);
      }

      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers, pads:{lgp, rgp} }, dt);
    } else {
      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers }, dt);
      HUD.setInput("2D");
    }

    renderer.render(scene, camera);
  });
}

(async function boot(){
  HUD.setMode("booting");
  HUD.setXR(!!navigator.xr);
  HUD.log("[BOOT] booting…");

  const THREE = await loadTHREE();
  HUD.log("[BOOT] THREE loaded ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 10, 95);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.02, 380);
  camera.position.set(0,1.65,0);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));
  HUD.log("[index] VRButton appended ✅");

  const controllers = installLasers(THREE, renderer, player, HUD);

  const WorldMod = await import(`./world.js?v=${Date.now()}`);
  HUD.log("[index] world.js imported ✅");

  const World = WorldMod.World;
  await World.build({ THREE, scene, renderer, camera, player, controllers, log: HUD.log });

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  HUD.setMode("running");
  bootLoop(THREE, { THREE, scene, renderer, camera, player, controllers, World }, HUD);
  HUD.log("[index] runtime running ✅");
})();
