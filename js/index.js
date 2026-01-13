// /js/index.js — Scarlett FULL XR Runtime v5.3 (FULL)
// ✅ HUD Copy/Clear/Hide + Admin + Mute + News overlay
// ✅ THREE from CDN
// ✅ Controllers parented to PlayerRig (lasers move with player)
// ✅ Quest sticks: left move, right turn (robust gamepad pick)
// ✅ World.frame gets {pads:{lgp,rgp}} for correct teleport button mapping

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
  const muteBtn = btn("Mute");
  const newsBtn = btn("News");
  const resetBtn = btn("Reset Hand");
  const vipBtn = btn("TP VIP");
  const storeBtn = btn("TP Store");
  const pokerBtn = btn("TP Poker");
  const eventBtn = btn("TP Event");

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
  bar.appendChild(muteBtn);
  bar.appendChild(newsBtn);
  bar.appendChild(resetBtn);
  bar.appendChild(vipBtn);
  bar.appendChild(storeBtn);
  bar.appendChild(pokerBtn);
  bar.appendChild(eventBtn);
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

  const api = {
    log,
    setXR:(supported)=>badgeXR.textContent = `XR: ${supported ? "supported" : "no"}`,
    setMode:(txt)=>badgeMode.textContent = `Mode: ${txt}`,
    setInput:(txt)=>badgeInput.textContent = `Input: ${txt}`,
    bindWorld(World){
      let muted = false;

      muteBtn.onclick = ()=>{
        muted = !muted;
        muteBtn.textContent = muted ? "Unmute" : "Mute";
        World?.setMuted?.(muted);
        log(`[admin] muted=${muted}`);
      };

      newsBtn.onclick = ()=> window.ScarlettNews?.toggle?.();
      resetBtn.onclick = ()=> World?.admin?.resetHand?.();
      vipBtn.onclick   = ()=> World?.admin?.teleportTo?.("vip");
      storeBtn.onclick = ()=> World?.admin?.teleportTo?.("store");
      pokerBtn.onclick = ()=> World?.admin?.teleportTo?.("poker");
      eventBtn.onclick = ()=> World?.admin?.teleportTo?.("event");
    }
  };

  return api;
})();

// --- NEWS DOM OVERLAY (YouTube Live via Channel ID, no server) ---
function installNewsOverlay(HUD){
  const wrap = document.createElement("div");
  wrap.id = "news-wrap";
  wrap.style.cssText = `
    position:fixed; left:50%; top:58%;
    transform:translate(-50%,-50%);
    width:min(92vw, 980px);
    aspect-ratio:16/9;
    z-index:99998;
    border-radius:18px;
    overflow:hidden;
    border:1px solid rgba(127,231,255,.28);
    box-shadow:0 18px 60px rgba(0,0,0,.55);
    background:rgba(0,0,0,.25);
    display:none;
    pointer-events:auto;
  `;

  const iframe = document.createElement("iframe");
  iframe.id = "jumbo-iframe";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.referrerPolicy = "origin";
  iframe.style.cssText = `width:100%; height:100%; border:0; background:#000;`;
  wrap.appendChild(iframe);

  const picker = document.createElement("div");
  picker.style.cssText = `
    position:absolute; left:10px; top:10px; z-index:2;
    display:flex; gap:8px; flex-wrap:wrap;
    pointer-events:auto;
  `;

  const btn = (txt)=>{
    const b=document.createElement("button");
    b.textContent=txt;
    b.style.cssText=`
      padding:8px 10px; border-radius:12px;
      border:1px solid rgba(127,231,255,.32);
      background:rgba(11,13,20,.85);
      color:#e8ecff; cursor:pointer;
    `;
    return b;
  };

  const B_ABC = btn("ABC");
  const B_NBC = btn("NBC");
  const B_CBS = btn("CBS");
  const B_FOX = btn("FOX");
  const B_CLOSE = btn("Close");

  picker.appendChild(B_ABC);
  picker.appendChild(B_NBC);
  picker.appendChild(B_CBS);
  picker.appendChild(B_FOX);
  picker.appendChild(B_CLOSE);

  wrap.appendChild(picker);
  document.body.appendChild(wrap);

  const API = {
    visible:false,
    show(){ wrap.style.display="block"; API.visible=true; },
    hide(){ wrap.style.display="none"; API.visible=false; },
    toggle(){ (wrap.style.display==="none") ? API.show() : API.hide(); },
    setChannel(channelId){
      const src = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1&mute=0`;
      iframe.src = src;
      API.show();
      HUD?.log?.(`[news] channel=${channelId}`);
    }
  };

  B_ABC.onclick = ()=> API.setChannel("UCICw6A99vJj7-EdfzHIsS2A");
  B_NBC.onclick = ()=> API.setChannel("UCeY0bbntWzzVIaj2z3QigXg");
  B_CBS.onclick = ()=> API.setChannel("UC8p1vwvWtl6tTNnaQjve2Xg");
  B_FOX.onclick = ()=> API.setChannel("UCpVm7bg6pXKo1Pr6k5kxG9A");
  B_CLOSE.onclick = ()=> API.hide();

  window.ScarlettNews = API;
  HUD?.log?.("[news] overlay installed ✅");
  return API;
}

function isTouch(){ return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0); }

function installAndroidDualStick(HUD){
  if(!isTouch()) return null;

  const mk=(side)=>{
    const root=document.createElement("div");
    root.style.cssText=`
      position:fixed; bottom:18px; ${side==="left"?"left:18px":"right:18px"};
      width:160px; height:160px; border-radius:999px;
      border:1px solid rgba(255,255,255,0.18);
      background:rgba(10,12,18,0.25); backdrop-filter:blur(6px);
      touch-action:none; z-index:99999; user-select:none;
      pointer-events:auto;
    `;
    const nub=document.createElement("div");
    nub.style.cssText=`
      position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
      width:64px; height:64px; border-radius:999px;
      background:rgba(127,231,255,0.22);
      border:1px solid rgba(127,231,255,0.45);
      box-shadow:0 0 18px rgba(127,231,255,0.25);
    `;
    root.appendChild(nub);
    document.body.appendChild(root);

    const st={x:0,y:0,active:false,id:-1,cx:0,cy:0,nub};
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

    root.addEventListener("pointerdown",(e)=>{
      st.active=true; st.id=e.pointerId;
      const r=root.getBoundingClientRect(); st.cx=r.left+r.width/2; st.cy=r.top+r.height/2;
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener("pointermove",(e)=>{
      if(!st.active||e.pointerId!==st.id) return;
      const dx=e.clientX-st.cx, dy=e.clientY-st.cy;
      const max=52;
      st.x=clamp(dx/max,-1,1); st.y=clamp(dy/max,-1,1);
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

  const left=mk("left"), right=mk("right");
  HUD.log("[android] dual-stick ready ✅");
  return { left, right };
}

async function loadTHREE(){
  return await import("https://unpkg.com/three@0.160.0/build/three.module.js");
}

function installLasers(THREE, renderer, player, HUD){
  const controllers=[];
  const makeLaser=()=>{
    const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-2.2)]);
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

// Robust pick for Quest inputSources
function pickXRGamepads(renderer){
  const session = renderer.xr.getSession?.();
  const out = { leftGp:null, rightGp:null };
  if(!session) return out;

  for(const src of session.inputSources){
    if(!src?.gamepad) continue;
    if(src.handedness === "left") out.leftGp = src.gamepad;
    if(src.handedness === "right") out.rightGp = src.gamepad;
  }

  if(!out.leftGp || !out.rightGp){
    const gps=[];
    for(const src of session.inputSources){
      if(src?.gamepad) gps.push(src.gamepad);
    }
    if(!out.leftGp) out.leftGp = gps[0] || null;
    if(!out.rightGp) out.rightGp = gps[1] || out.leftGp || null;
  }
  return out;
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

      let mx=0,mz=0,turn=0;
      if(lgp?.axes?.length >= 2){
        mx = deadzone(lgp.axes[0] || 0, 0.14);
        mz = deadzone(lgp.axes[1] || 0, 0.14);
      }
      if(rgp?.axes?.length >= 2){
        turn = deadzone(rgp.axes[0] || 0, 0.14);
      }

      const yaw = player.rotation.y;
      const speed = 2.05 * dt;

      player.rotation.y -= turn * 2.05 * dt;

      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;
      player.position.x += vx;
      player.position.z += vz;

      dbgT += dt;
      if(dbgT > 0.8){
        dbgT = 0;
        HUD.setInput(`XR Laxes=${lgp?.axes?.length||0} Raxes=${rgp?.axes?.length||0} L(${(lgp?.axes?.[0]||0).toFixed(2)},${(lgp?.axes?.[1]||0).toFixed(2)}) R(${(rgp?.axes?.[0]||0).toFixed(2)},${(rgp?.axes?.[1]||0).toFixed(2)})`);
      }

      STATE.World?.frame?.({ THREE, scene, renderer, camera, player, controllers, pads:{lgp, rgp} }, dt);
    } else if(STATE.touchSticks){
      const mx = STATE.touchSticks.left?.x || 0;
      const mz = STATE.touchSticks.left?.y || 0;
      const turn = STATE.touchSticks.right?.x || 0;

      const yaw = player.rotation.y;
      const speed = 2.0 * dt;
      player.rotation.y -= turn * 2.0 * dt;

      const vx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * speed;
      const vz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * speed;
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

(async function boot(){
  HUD.setMode("booting");
  HUD.setXR(!!navigator.xr);
  HUD.log("[BOOT] booting…");

  const THREE = await loadTHREE();
  HUD.log("[BOOT] THREE loaded ✅");

  installNewsOverlay(HUD);

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

  const touchSticks = installAndroidDualStick(HUD);
  const controllers = installLasers(THREE, renderer, player, HUD);

  const WorldMod = await import(`./world.js?v=${Date.now()}`);
  HUD.log("[index] world.js imported ✅");

  const World = WorldMod.World;
  await World.build({ THREE, scene, renderer, camera, player, controllers, log: HUD.log });
  HUD.bindWorld(World);

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  HUD.setMode("running");
  bootLoop(THREE, { THREE, scene, renderer, camera, player, controllers, touchSticks, World }, HUD);
  HUD.log("[index] runtime running ✅");
})();
