// /js/index.js — Scarlett XR Movement Auto-Axes v5.4.2 (FULL)
// ✅ Fixes "no movement" by auto-detecting active stick axes pairs (0/1, 2/3, 4/5)
// ✅ Uses XR inputSources + navigator.getGamepads fallback
// ✅ HUD shows which axes are used + values
// ✅ Lasers rig-parented
// ✅ Sends pads into world.frame for teleport A/X logic

import { VRButton } from "./VRButton.js";

const HUD = (() => {
  const state = { lines: [], max: 2500 };
  const el = (tag, css) => { const e=document.createElement(tag); if(css) e.style.cssText=css; return e; };

  const root = el("div", `
    position:fixed; left:10px; top:10px; right:10px;
    max-height:46vh; overflow:auto; z-index:99999;
    padding:12px; border-radius:16px;
    background:rgba(5,6,10,.62); backdrop-filter:blur(10px);
    border:1px solid rgba(127,231,255,.2);
    color:#e8ecff; font-family:system-ui,Segoe UI,Roboto,Arial;
    pointer-events:none;
  `);

  const bar = el("div", `display:flex; gap:10px; align-items:center; margin-bottom:10px; pointer-events:auto; flex-wrap:wrap;`);
  const title = el("div", `font-weight:900; letter-spacing:.2px;`); title.textContent="Scarlett VR Poker";

  const pill=(txt)=>{ const p=el("div",`padding:6px 10px;border-radius:999px;border:1px solid rgba(127,231,255,.18);background:rgba(11,13,20,.6);font-size:12px;opacity:.95;`); p.textContent=txt; return p; };
  const badgeXR=pill("XR: ?");
  const badgeMode=pill("Mode: boot");
  const badgeInput=pill("Input: ?");

  const btn=(txt)=>{ const b=el("button",`padding:8px 10px;border-radius:12px;border:1px solid rgba(127,231,255,.32);background:rgba(11,13,20,.85);color:#e8ecff;cursor:pointer;`); b.textContent=txt; b.style.pointerEvents="auto"; return b; };
  const copyBtn=btn("Copy"), clearBtn=btn("Clear"), hideBtn=btn("Hide HUD");
  const showBtn=btn("Show HUD");
  showBtn.style.cssText="position:fixed;top:10px;right:10px;z-index:999999;display:none;";

  const logBox=el("pre",`margin:0;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.25;`);

  bar.appendChild(title); bar.appendChild(badgeXR); bar.appendChild(badgeMode); bar.appendChild(badgeInput);
  bar.appendChild(copyBtn); bar.appendChild(clearBtn); bar.appendChild(hideBtn);
  root.appendChild(bar); root.appendChild(logBox);
  document.body.appendChild(root); document.body.appendChild(showBtn);

  function render(){ logBox.textContent=state.lines.join("\n"); root.scrollTop=root.scrollHeight; }
  function log(...a){
    const t=new Date();
    const ts=`[${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}]`;
    state.lines.push(`${ts} ${a.join(" ")}`);
    if(state.lines.length>state.max) state.lines.splice(0,state.lines.length-state.max);
    render(); console.log(...a);
  }

  copyBtn.onclick=async()=>{ try{ await navigator.clipboard.writeText(state.lines.join("\n")); log("[hud] copied ✅"); }catch(e){ log("[hud] copy failed:", e?.message||e); } };
  clearBtn.onclick=()=>{ state.lines=[]; render(); };
  hideBtn.onclick=()=>{ root.style.display="none"; showBtn.style.display="block"; };
  showBtn.onclick=()=>{ root.style.display="block"; showBtn.style.display="none"; };

  window.addEventListener("error",(e)=>log("[FATAL]", e.message||e.error||e));
  window.addEventListener("unhandledrejection",(e)=>log("[FATAL promise]", e.reason?.message||e.reason||e));

  return {
    log,
    setXR:(s)=>badgeXR.textContent=`XR: ${s?"supported":"no"}`,
    setMode:(m)=>badgeMode.textContent=`Mode: ${m}`,
    setInput:(t)=>badgeInput.textContent=`Input: ${t}`
  };
})();

async function loadTHREE(){
  return await import("https://unpkg.com/three@0.160.0/build/three.module.js");
}

function installLasers(THREE, renderer, player, HUD){
  const controllers=[];
  const makeLaser=()=>{
    const geo=new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-2.2) ]);
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

function pickXRGamepads(renderer){
  const session = renderer.xr.getSession?.();
  const gps = [];

  // 1) XR inputSources
  if(session){
    for(const src of session.inputSources){
      if(src?.gamepad) gps.push({ gp:src.gamepad, hand:src.handedness||"" });
    }
  }

  // 2) Fallback: navigator.getGamepads (some Quest builds expose here)
  try{
    const ng = navigator.getGamepads?.() || [];
    for(const gp of ng){
      if(gp && gp.axes && gp.buttons){
        // avoid duplicates by id if possible
        if(!gps.some(x=>x.gp===gp)) gps.push({ gp, hand:"" });
      }
    }
  }catch{}

  // prefer handedness, otherwise first two
  let leftGp  = gps.find(x=>x.hand==="left")?.gp || null;
  let rightGp = gps.find(x=>x.hand==="right")?.gp || null;

  if(!leftGp) leftGp = gps[0]?.gp || null;
  if(!rightGp) rightGp = gps[1]?.gp || gps[0]?.gp || null;

  return { leftGp, rightGp, count:gps.length };
}

// choose the axes pair that has the strongest signal
function pickBestAxesPair(axes){
  const pairs = [[0,1],[2,3],[4,5]];
  let best = { i0:0, i1:1, mag:0 };
  for(const [i0,i1] of pairs){
    if(axes.length <= Math.max(i0,i1)) continue;
    const x = axes[i0]||0;
    const y = axes[i1]||0;
    const mag = Math.abs(x)+Math.abs(y);
    if(mag > best.mag) best = { i0, i1, mag };
  }
  return best;
}

function readMove(gp){
  if(!gp?.axes) return { mx:0, mz:0, pair:"none", raw:[0,0] };
  const axes = gp.axes;
  const p = pickBestAxesPair(axes);
  const mx = deadzone(axes[p.i0]||0, 0.14);
  const mz = deadzone(axes[p.i1]||0, 0.14);
  return { mx, mz, pair:`(${p.i0},${p.i1})`, raw:[axes[p.i0]||0, axes[p.i1]||0] };
}

function readTurn(gp){
  if(!gp?.axes) return { turn:0, idx:"none", raw:0 };
  const axes = gp.axes;
  // try common turn indices: 0 then 2 then 4
  const candidates=[0,2,4];
  let best={ idx:0, mag:0, val:0 };
  for(const idx of candidates){
    if(axes.length <= idx) continue;
    const v = axes[idx]||0;
    const mag = Math.abs(v);
    if(mag > best.mag) best={ idx, mag, val:v };
  }
  return { turn: deadzone(best.val, 0.14), idx:String(best.idx), raw:best.val };
}

function bootLoop(THREE, STATE, HUD){
  const { renderer, scene, camera, player, controllers } = STATE;
  const clock = new THREE.Clock();
  let dbgT=0;

  renderer.setAnimationLoop(()=>{
    const dt = Math.min(0.05, clock.getDelta());

    if(renderer.xr.isPresenting){
      const pads = pickXRGamepads(renderer);
      const lgp = pads.leftGp;
      const rgp = pads.rightGp;

      const L = readMove(lgp);
      const T = readTurn(rgp);

      // move / turn
      const yaw = player.rotation.y;
      const speed = 2.35 * dt;

      player.rotation.y -= T.turn * 2.4 * dt;

      const vx = (L.mx * Math.cos(yaw) - L.mz * Math.sin(yaw)) * speed;
      const vz = (L.mx * Math.sin(yaw) + L.mz * Math.cos(yaw)) * speed;
      player.position.x += vx;
      player.position.z += vz;

      dbgT += dt;
      if(dbgT > 0.8){
        dbgT=0;
        HUD.setInput(`XR gps=${pads.count} movePair=${L.pair} move=(${L.raw[0].toFixed(2)},${L.raw[1].toFixed(2)}) turnIdx=${T.idx} turn=${T.raw.toFixed(2)}`);
      }

      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers, pads:{ lgp, rgp } }, dt);
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
  player.name="PlayerRig";
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
