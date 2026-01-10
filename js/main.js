// /js/main.js — Scarlett MASTER BOOT v14.2 (FULL)
// ✅ World.update(dt) loop
// ✅ Controllers array + axes capture for World locomotion
// ✅ Android: dual sticks move/look + HUD buttons (Action/Teleport)
// ✅ Android: tap to click + 2-finger teleport fallback
// ✅ Debug hub non-overlapping

import * as THREE from "./three.js";

async function loadVRButton() {
  try {
    const mod = await import("./VRButton.js");
    return mod.VRButton || mod.default || null;
  } catch {
    return null;
  }
}

async function loadWorld(BUILD) {
  const mod = await import(`./world.js?v=${BUILD}`);
  return mod.World;
}

const BUILD = Date.now();
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const app = document.getElementById("app");
const btnDebug = document.getElementById("btnDebug");
const btnMenu = document.getElementById("btnMenu");

// Create HUD buttons if missing (safe)
(function ensureHudButtons(){
  const hud = document.getElementById("hud");
  if (!hud) return;

  const need = (id, label) => {
    let b = document.getElementById(id);
    if (!b) {
      b = document.createElement("button");
      b.className = "chip";
      b.id = id;
      b.textContent = label;
      hud.appendChild(b);
    }
    return b;
  };

  need("btnAction", "Action");
  need("btnTeleport", "Teleport");
})();

const btnAction = document.getElementById("btnAction");
const btnTeleport = document.getElementById("btnTeleport");

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

// Scene/camera/player rig
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 1200);

const player = new THREE.Group();
scene.add(player);

camera.position.set(0, 1.65, 0);
player.add(camera);

// Safety ambient so Android never goes black
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// -----------------------------------------------------------
// Debug hub (same behavior as before)
// -----------------------------------------------------------
const dbgHub = document.getElementById("androidDebugHub");
const dbgFab = document.getElementById("androidDebugFab");
const dbgLogEl = document.getElementById("dbgLog");

function dbg(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  if (dbgLogEl) {
    dbgLogEl.textContent = (dbgLogEl.textContent + "\n" + line).trim();
    dbgLogEl.scrollTop = dbgLogEl.scrollHeight;
  }
}

// Enable debug hub on mobile
(function initAndroidDebugHub(){
  if (!dbgHub || !dbgFab) return;
  if (!isMobile) return;

  const btnCollapse = document.getElementById("dbgCollapseBtn");
  const btnHide = document.getElementById("dbgHideBtn");

  function clampToViewport(){
    if (dbgHub.style.display === "none") return;
    const r = dbgHub.getBoundingClientRect();
    const pad = 8;
    let x = r.left, y = r.top;
    x = Math.max(pad, Math.min(window.innerWidth - r.width - pad, x));
    y = Math.max(pad, Math.min(window.innerHeight - r.height - pad, y));
    dbgHub.style.left = x + "px";
    dbgHub.style.top  = y + "px";
    dbgHub.style.right = "auto";
    dbgHub.style.bottom = "auto";
    try { localStorage.setItem("dbgHubPos", JSON.stringify({x,y})); } catch {}
  }

  function showHub(){ dbgHub.style.display="block"; dbgFab.classList.remove("show"); clampToViewport(); }
  function hideHub(){ dbgHub.style.display="none"; dbgFab.classList.add("show"); }

  dbgHub.style.display="none";
  dbgFab.classList.add("show");

  btnDebug?.addEventListener("click", ()=> {
    const vis = dbgHub.style.display !== "none";
    if (vis) hideHub(); else showHub();
  });
  dbgFab.addEventListener("click", showHub);

  btnCollapse?.addEventListener("click",(e)=>{
    e.stopPropagation();
    dbgHub.classList.toggle("collapsed");
    try { localStorage.setItem("dbgHubCollapsed", dbgHub.classList.contains("collapsed") ? "1" : "0"); } catch {}
    clampToViewport();
  });
  btnHide?.addEventListener("click",(e)=>{ e.stopPropagation(); hideHub(); });

  try {
    const saved = JSON.parse(localStorage.getItem("dbgHubPos") || "null");
    if (saved && typeof saved.x==="number" && typeof saved.y==="number") {
      dbgHub.style.left = saved.x + "px";
      dbgHub.style.top  = saved.y + "px";
      dbgHub.style.right = "auto";
      dbgHub.style.bottom = "auto";
    }
    const collapsed = localStorage.getItem("dbgHubCollapsed");
    if (collapsed === "0") dbgHub.classList.remove("collapsed");
    if (collapsed === "1") dbgHub.classList.add("collapsed");
  } catch {}

  const header = dbgHub.querySelector(".dbgHeader");
  if (!header) return;

  let dragging=false, startX=0,startY=0, baseX=0,baseY=0;

  header.addEventListener("pointerdown",(e)=>{
    if (e.target && (e.target.tagName==="BUTTON" || e.target.closest("button"))) return;
    dragging=true;
    dbgHub.classList.add("dragging");
    header.setPointerCapture(e.pointerId);
    const r = dbgHub.getBoundingClientRect();
    startX=e.clientX; startY=e.clientY;
    baseX=r.left; baseY=r.top;
    dbgHub.style.left = baseX + "px";
    dbgHub.style.top  = baseY + "px";
    dbgHub.style.right="auto";
    dbgHub.style.bottom="auto";
  });

  header.addEventListener("pointermove",(e)=>{
    if (!dragging) return;
    dbgHub.style.left = (baseX + (e.clientX-startX)) + "px";
    dbgHub.style.top  = (baseY + (e.clientY-startY)) + "px";
  });

  header.addEventListener("pointerup",(e)=>{
    if (!dragging) return;
    dragging=false;
    dbgHub.classList.remove("dragging");
    try{ header.releasePointerCapture(e.pointerId);}catch{}
    clampToViewport();
  });

  window.addEventListener("resize", clampToViewport);
})();

// -----------------------------------------------------------
// Android dual-stick move/look
// -----------------------------------------------------------
const touchControls = document.getElementById("touchControls");
const input = { moveX:0, moveY:0, lookX:0, lookY:0, yaw:0, pitch:0, enabled:false };
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

function setupSticks(){
  if (!touchControls) return;

  const moveStick = document.getElementById("moveStick");
  const lookStick = document.getElementById("lookStick");
  const state = {
    move: { active:false, id:null, ox:0, oy:0 },
    look: { active:false, id:null, ox:0, oy:0 }
  };

  function bind(stickEl, which){
    const nub = stickEl.querySelector(".nub");
    const S = state[which];

    const setNub = (x,y)=>{
      if (!nub) return;
      nub.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    };

    stickEl.addEventListener("pointerdown",(e)=>{
      S.active=true; S.id=e.pointerId;
      stickEl.setPointerCapture(e.pointerId);
      const r = stickEl.getBoundingClientRect();
      S.ox = r.left + r.width/2;
      S.oy = r.top + r.height/2;
      setNub(0,0);
    });

    stickEl.addEventListener("pointermove",(e)=>{
      if (!S.active || e.pointerId!==S.id) return;
      const dx = e.clientX - S.ox;
      const dy = e.clientY - S.oy;
      const max = 46;
      const nx = clamp(dx, -max, max);
      const ny = clamp(dy, -max, max);
      setNub(nx, ny);

      const vx = nx / max;
      const vy = ny / max;

      if (which==="move"){
        input.moveX = vx;
        input.moveY = -vy;
      } else {
        input.lookX = vx;
        input.lookY = -vy;
      }
    });

    const end = (e)=>{
      if (e.pointerId!==S.id) return;
      S.active=false; S.id=null;
      setNub(0,0);
      if (which==="move"){ input.moveX=0; input.moveY=0; }
      else { input.lookX=0; input.lookY=0; }
    };

    stickEl.addEventListener("pointerup", end);
    stickEl.addEventListener("pointercancel", end);
  }

  bind(moveStick,"move");
  bind(lookStick,"look");
}

function enableAndroidControlsIfNeeded(){
  const xrActive = renderer.xr.isPresenting;
  if (isMobile && !xrActive) {
    touchControls.style.display = "block";
    input.enabled = true;
  } else {
    touchControls.style.display = "none";
    input.enabled = false;
    input.moveX=input.moveY=input.lookX=input.lookY=0;
  }
}

setupSticks();
enableAndroidControlsIfNeeded();

// -----------------------------------------------------------
// Controllers array + axes capture
// -----------------------------------------------------------
let controllers = []; // [0]=left [1]=right

function buildControllerArray(){
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  controllers = [c0, c1];
  scene.add(c0); scene.add(c1);
}

function updateControllerAxes(){
  for (const c of controllers) {
    const src = c?.inputSource;
    const gp = src?.gamepad;
    if (gp && gp.axes) c.userData.axes = gp.axes.slice(0);
    else if (!c.userData.axes) c.userData.axes = [0,0,0,0];
  }
}

buildControllerArray();

renderer.xr.addEventListener("sessionstart", ()=>{
  dbg("[main] XR sessionstart ✅");
  buildControllerArray();
  enableAndroidControlsIfNeeded();
});
renderer.xr.addEventListener("sessionend", ()=>{
  dbg("[main] XR sessionend ✅");
  enableAndroidControlsIfNeeded();
});

// VRButton
(async ()=>{
  const VRButton = await loadVRButton();
  if (VRButton && navigator.xr) {
    document.body.appendChild(VRButton.createButton(renderer));
    dbg("[main] VRButton appended ✅");
  } else {
    dbg("[main] VRButton not available (ok)");
  }
})();

// -----------------------------------------------------------
// Load world
// -----------------------------------------------------------
const World = await loadWorld(BUILD);
dbg("[main] world.js imported ✅");

await World.init({ THREE, scene, renderer, camera, player, controllers, log: dbg, BUILD });
dbg("[main] world init ✅");

// HUD buttons
btnAction?.addEventListener("click", ()=> { try { World.clickFromCamera?.(); } catch {} });
btnTeleport?.addEventListener("click", ()=> { try { World.teleportFromCamera?.(); } catch {} });
btnMenu?.addEventListener("click", ()=> dbg("[ui] Menu tapped"));

// Touch fallback: 1 tap action, 2-finger tap teleport
let twoFingerArmed = false;

function isUIHit(e){
  const el = e.target;
  if (!el) return false;
  return !!(el.closest?.("#hud") || el.closest?.("#androidDebugHub") || el.closest?.("#androidDebugFab") || el.closest?.("#touchControls"));
}

renderer.domElement.addEventListener("touchstart", (e)=>{
  if (renderer.xr.isPresenting) return;
  if (isUIHit(e)) return;
  if (e.touches.length === 2) twoFingerArmed = true;
}, { passive:true });

renderer.domElement.addEventListener("touchend", (e)=>{
  if (renderer.xr.isPresenting) return;
  if (isUIHit(e)) return;

  if (twoFingerArmed) {
    twoFingerArmed = false;
    try { World.teleportFromCamera?.(); } catch {}
    return;
  }
  try { World.clickFromCamera?.(); } catch {}
}, { passive:true });

// Non-XR movement
const clock = new THREE.Clock();

function updateNonXR(dt){
  if (!input.enabled) return;

  input.yaw   -= input.lookX * dt * 2.2;
  input.pitch  = clamp(input.pitch + input.lookY * dt * 1.6, -1.2, 1.2);

  player.rotation.y = input.yaw;
  camera.rotation.x = input.pitch;

  const speed = 2.2;
  const mx = input.moveX, my = input.moveY;

  if (mx || my) {
    const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), input.yaw);
    const right   = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), input.yaw);
    const vel = new THREE.Vector3();
    vel.addScaledVector(forward, my);
    vel.addScaledVector(right, mx);
    if (vel.lengthSq() > 0.0001) {
      vel.normalize().multiplyScalar(speed * dt);
      player.position.add(vel);
    }
  }
}

// Render loop
renderer.setAnimationLoop(()=>{
  const dt = Math.min(clock.getDelta(), 0.05);
  enableAndroidControlsIfNeeded();
  updateControllerAxes();
  if (!renderer.xr.isPresenting) updateNonXR(dt);
  World.update?.(dt);
  renderer.render(scene, camera);
});

// Resize
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
