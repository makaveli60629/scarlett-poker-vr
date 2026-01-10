// /js/main.js — Scarlett VR Poker MASTER BOOT (Android + Quest + Full World)
// - Loads /js/world.js (your MASTER WORLD v11+)
// - Android: two-thumb move + look + debug hub that doesn't block touches
// - Quest: WebXR VRButton + controllers (world handles teleport etc if present)
// - Cache-bust friendly: BUILD version passed to world

import * as THREE from "./three.js";

// Optional VRButton (local copy) – if missing, we still run non-XR
async function loadVRButton() {
  try {
    const mod = await import("./VRButton.js");
    return mod.VRButton || mod.default || null;
  } catch (e) { return null; }
}

// Full world loader
async function loadWorld(BUILD) {
  try {
    const mod = await import(`./world.js?v=${BUILD}`);
    return mod.World;
  } catch (e) {
    console.error("[main] world import failed:", e);
    return null;
  }
}

const BUILD = Date.now();
const log = (...a) => console.log(...a);

log("[main] boot ✅ v=" + BUILD);
log("[main] ua=" + navigator.userAgent);
log("[main] xr=" + !!navigator.xr);

const app = document.getElementById("app");

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

// Scene & camera rig
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 1200);

// Player rig: player -> head (camera)
const player = new THREE.Group();
player.name = "player";
scene.add(player);

camera.position.set(0, 1.65, 0);
player.add(camera);

// Basic ambient so Android never goes black even if world lights fail
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// Debug hub
const dbgHub = document.getElementById("androidDebugHub");
const dbgFab = document.getElementById("androidDebugFab");
const dbgLogEl = document.getElementById("dbgLog");
const btnDebug = document.getElementById("btnDebug");
const btnMenu = document.getElementById("btnMenu");

function dbg(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  if (dbgLogEl) {
    dbgLogEl.textContent = (dbgLogEl.textContent + "\n" + line).trim();
    dbgLogEl.scrollTop = dbgLogEl.scrollHeight;
  }
}

// Mobile detection
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const touchControls = document.getElementById("touchControls");

// --- Android Debug Hub controls (drag/collapse/hide) ---
(function initAndroidDebugHub(){
  if (!dbgHub || !dbgFab) return;
  if (!isMobile) return;

  dbgHub.style.display = "none";
  dbgFab.classList.remove("show");

  const btnCollapse = document.getElementById("dbgCollapseBtn");
  const btnHide = document.getElementById("dbgHideBtn");

  function showHub() {
    dbgHub.style.display = "block";
    dbgFab.classList.remove("show");
    clampToViewport();
  }
  function hideHub() {
    dbgHub.style.display = "none";
    dbgFab.classList.add("show");
  }

  btnDebug?.addEventListener("click", () => {
    const vis = dbgHub.style.display !== "none";
    if (vis) hideHub(); else showHub();
  });

  dbgFab.addEventListener("click", showHub);

  btnCollapse?.addEventListener("click", (e)=>{
    e.stopPropagation();
    dbgHub.classList.toggle("collapsed");
    try { localStorage.setItem("dbgHubCollapsed", dbgHub.classList.contains("collapsed") ? "1" : "0"); } catch {}
    clampToViewport();
  });

  btnHide?.addEventListener("click", (e)=>{
    e.stopPropagation();
    hideHub();
  });

  // restore
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

  function clampToViewport(){
    if (dbgHub.style.display === "none") return;
    const r = dbgHub.getBoundingClientRect();
    const pad = 8;
    let x = r.left, y = r.top;

    const maxX = window.innerWidth - r.width - pad;
    const maxY = window.innerHeight - r.height - pad;

    x = Math.max(pad, Math.min(maxX, x));
    y = Math.max(pad, Math.min(maxY, y));

    dbgHub.style.left = x + "px";
    dbgHub.style.top  = y + "px";
    dbgHub.style.right = "auto";
    dbgHub.style.bottom = "auto";

    try { localStorage.setItem("dbgHubPos", JSON.stringify({x,y})); } catch {}
  }

  // Drag
  const header = dbgHub.querySelector(".dbgHeader");
  if (!header) return;

  let dragging = false;
  let startX=0, startY=0, baseX=0, baseY=0;

  header.addEventListener("pointerdown", (e)=>{
    if (e.target && (e.target.tagName === "BUTTON" || e.target.closest("button"))) return;
    dragging = true;
    dbgHub.classList.add("dragging");
    header.setPointerCapture(e.pointerId);

    const r = dbgHub.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    baseX = r.left;
    baseY = r.top;

    dbgHub.style.left = baseX + "px";
    dbgHub.style.top  = baseY + "px";
    dbgHub.style.right = "auto";
    dbgHub.style.bottom = "auto";
  });

  header.addEventListener("pointermove", (e)=>{
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dbgHub.style.left = (baseX + dx) + "px";
    dbgHub.style.top  = (baseY + dy) + "px";
  });

  header.addEventListener("pointerup", (e)=>{
    if (!dragging) return;
    dragging = false;
    dbgHub.classList.remove("dragging");
    try { header.releasePointerCapture(e.pointerId); } catch {}
    clampToViewport();
  });

  window.addEventListener("resize", clampToViewport);

  // start hidden; user toggles with Debug button
  dbgFab.classList.add("show");
})();

// --- Android two-thumb controls (non-XR) ---
const input = {
  moveX: 0, moveY: 0,
  lookX: 0, lookY: 0,
  yaw: 0,
  pitch: 0,
  enabled: false
};

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function setupSticks(){
  if (!touchControls) return;

  const moveStick = document.getElementById("moveStick");
  const lookStick = document.getElementById("lookStick");

  const state = {
    move: { active:false, id:null, ox:0, oy:0, nx:0, ny:0 },
    look: { active:false, id:null, ox:0, oy:0, nx:0, ny:0 }
  };

  function bind(stickEl, which){
    const nub = stickEl.querySelector(".nub");
    const S = state[which];

    const setNub = (x,y)=>{
      if (!nub) return;
      nub.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    };

    stickEl.addEventListener("pointerdown", (e)=>{
      S.active = true;
      S.id = e.pointerId;
      stickEl.setPointerCapture(e.pointerId);

      const r = stickEl.getBoundingClientRect();
      S.ox = r.left + r.width/2;
      S.oy = r.top + r.height/2;
      S.nx = 0; S.ny = 0;
      setNub(0,0);
    });

    stickEl.addEventListener("pointermove", (e)=>{
      if (!S.active || e.pointerId !== S.id) return;
      const dx = e.clientX - S.ox;
      const dy = e.clientY - S.oy;
      const max = 46; // nub travel
      const nx = clamp(dx, -max, max);
      const ny = clamp(dy, -max, max);
      S.nx = nx / max;
      S.ny = ny / max;
      setNub(nx, ny);

      if (which === "move") {
        input.moveX = S.nx;
        input.moveY = -S.ny; // up = forward
      } else {
        input.lookX = S.nx;
        input.lookY = -S.ny;
      }
    });

    const end = (e)=>{
      if (e.pointerId !== S.id) return;
      S.active = false;
      S.id = null;
      S.nx = 0; S.ny = 0;
      setNub(0,0);

      if (which === "move") { input.moveX = 0; input.moveY = 0; }
      else { input.lookX = 0; input.lookY = 0; }
    };

    stickEl.addEventListener("pointerup", end);
    stickEl.addEventListener("pointercancel", end);
  }

  bind(moveStick, "move");
  bind(lookStick, "look");
}

function enableAndroidControlsIfNeeded(){
  // If XR session is running, don't show touch sticks
  const xrActive = renderer.xr.isPresenting;
  if (isMobile && !xrActive) {
    touchControls.style.display = "block";
    input.enabled = true;
  } else {
    touchControls.style.display = "none";
    input.enabled = false;
    input.moveX = input.moveY = input.lookX = input.lookY = 0;
  }
}

// Desktop mouse look (fallback)
let mouseLook = { active:false, lastX:0, lastY:0 };
renderer.domElement.addEventListener("pointerdown", (e)=>{
  if (isMobile) return;
  mouseLook.active = true;
  mouseLook.lastX = e.clientX;
  mouseLook.lastY = e.clientY;
});
window.addEventListener("pointerup", ()=>{ mouseLook.active=false; });
window.addEventListener("pointermove", (e)=>{
  if (!mouseLook.active) return;
  const dx = e.clientX - mouseLook.lastX;
  const dy = e.clientY - mouseLook.lastY;
  mouseLook.lastX = e.clientX; mouseLook.lastY = e.clientY;
  input.yaw -= dx * 0.0022;
  input.pitch = clamp(input.pitch - dy * 0.0022, -1.2, 1.2);
});

setupSticks();
enableAndroidControlsIfNeeded();

// --- VR Button ---
(async ()=>{
  const VRButton = await loadVRButton();
  if (VRButton && navigator.xr) {
    document.body.appendChild(VRButton.createButton(renderer));
    dbg("[main] VRButton appended ✅");
  } else {
    dbg("[main] VRButton not available (ok)");
  }
})();

// --- Load FULL WORLD ---
const controllers = { left: null, right: null, grips: [], hands: [] };

function initXRControllers(){
  // Safe: only attaches when XR starts
  try{
    controllers.left = renderer.xr.getController(0);
    controllers.right = renderer.xr.getController(1);
    scene.add(controllers.left);
    scene.add(controllers.right);

    const g0 = renderer.xr.getControllerGrip(0);
    const g1 = renderer.xr.getControllerGrip(1);
    scene.add(g0); scene.add(g1);
    controllers.grips = [g0, g1];

    dbg("[main] controllers ready ✅");
  } catch(e){
    dbg("[main] controllers init failed (ok) " + e.message);
  }
}

renderer.xr.addEventListener("sessionstart", ()=>{
  dbg("[main] XR sessionstart ✅");
  initXRControllers();
  enableAndroidControlsIfNeeded();
});
renderer.xr.addEventListener("sessionend", ()=>{
  dbg("[main] XR sessionend ✅");
  enableAndroidControlsIfNeeded();
});

const World = await loadWorld(BUILD);
let world = null;

if (World?.init) {
  dbg("[main] world.js found ✅");
  world = await World.init({
    THREE, scene, renderer, camera, player, controllers, log: dbg, BUILD
  });
  dbg("[main] world init ✅");
} else {
  dbg("[main] world.js missing or invalid — you will see fallback black-ish scene");
}

// --- Menu button (simple) ---
btnMenu?.addEventListener("click", ()=>{
  dbg("[ui] Menu tapped (wire to VR UI / RoomManager if desired)");
  // If your world exposes room manager:
  // world?.ctx?.RoomManager?.setRoom?.(world.ctx, "lobby");
});

// --- Movement update (Android + desktop) ---
const clock = new THREE.Clock();

function updateNonXR(dt){
  // Apply look from touch sticks
  if (input.enabled) {
    input.yaw -= input.lookX * dt * 2.2;
    input.pitch = clamp(input.pitch + input.lookY * dt * 1.6, -1.2, 1.2);
  }

  // Apply camera orientation
  player.rotation.y = input.yaw;
  camera.rotation.x = input.pitch;

  // Move relative to yaw
  const speed = 2.2; // m/s
  const mx = input.moveX;
  const my = input.moveY;

  if (input.enabled || (!isMobile)) {
    const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), input.yaw);
    const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), input.yaw);

    const vel = new THREE.Vector3();
    vel.addScaledVector(forward, my);
    vel.addScaledVector(right, mx);

    if (vel.lengthSq() > 0.0001) {
      vel.normalize().multiplyScalar(speed * dt);

      // If world has collision/controls, you can route through it.
      // Otherwise move rig directly:
      player.position.add(vel);
    }
  }
}

// Render loop
renderer.setAnimationLoop(()=>{
  const dt = Math.min(clock.getDelta(), 0.05);

  enableAndroidControlsIfNeeded();

  // If not XR, we drive movement here
  if (!renderer.xr.isPresenting) updateNonXR(dt);

  // If world has a tick/update, call it
  try { world?.tick?.(dt); } catch(e){}

  renderer.render(scene, camera);
});

// Resize
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
