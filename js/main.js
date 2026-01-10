// /js/main.js — Scarlett MASTER BOOT v15.0 (FULL)
// ✅ Y button toggles Menu (and M key)
// ✅ Android D-pad (compact) + Action + Teleport + Turn buttons
// ✅ XR controller rebuild on sessionstart (fix lasers stuck in table)
// ✅ World room routing + teleport-to-table via menu

import * as THREE from "./three.js";

async function loadVRButton() {
  try { const mod = await import("./VRButton.js"); return mod.VRButton || mod.default || null; }
  catch { return null; }
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

const menuOverlay = document.getElementById("menuOverlay");
const goLobby = document.getElementById("goLobby");
const goScorpion = document.getElementById("goScorpion");
const goStore = document.getElementById("goStore");
const goSpectate = document.getElementById("goSpectate");
const tpTable = document.getElementById("tpTable");
const closeMenu = document.getElementById("closeMenu");

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

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 2000);

const player = new THREE.Group();
scene.add(player);

camera.position.set(0, 1.65, 0);
player.add(camera);

// Safety ambient
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

let controllers = []; // [0]=left [1]=right
function buildControllerArray() {
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  controllers = [c0, c1];
  scene.add(c0); scene.add(c1);
}
buildControllerArray();

// --- Debug Hub (mobile)
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
    clampToViewport();
  });
  btnHide?.addEventListener("click",(e)=>{ e.stopPropagation(); hideHub(); });

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

// --- Menu toggle
function toggleMenu(force) {
  const show = (typeof force === "boolean") ? force : !menuOverlay.classList.contains("show");
  menuOverlay.classList.toggle("show", show);
}
btnMenu?.addEventListener("click", ()=> toggleMenu());
closeMenu?.addEventListener("click", ()=> toggleMenu(false));
window.addEventListener("keydown", (e)=> {
  if (e.key.toLowerCase() === "m") toggleMenu();
});

// --- Mobile D-pad
const mobilePad = document.getElementById("mobilePad");
const mAction = document.getElementById("mAction");
const mTeleport = document.getElementById("mTeleport");
const mTurnL = document.getElementById("mTurnL");
const mTurnR = document.getElementById("mTurnR");

const mob = { up:0, down:0, left:0, right:0 };
function showMobilePad(show){
  if (!mobilePad) return;
  mobilePad.style.display = show ? "grid" : "none";
}
function bindHold(btn, key){
  if (!btn) return;
  const set = (v)=> mob[key]=v;

  btn.addEventListener("pointerdown", (e)=>{ e.preventDefault(); set(1); btn.setPointerCapture(e.pointerId); });
  btn.addEventListener("pointerup",   ()=> set(0));
  btn.addEventListener("pointercancel",()=> set(0));
  btn.addEventListener("pointerleave", ()=> set(0));

  btn.addEventListener("touchstart", (e)=>{ e.preventDefault(); set(1); }, {passive:false});
  btn.addEventListener("touchend",   (e)=>{ e.preventDefault(); set(0); }, {passive:false});
  btn.addEventListener("touchcancel",(e)=>{ e.preventDefault(); set(0); }, {passive:false});
}
document.querySelectorAll("#mobilePad .d").forEach(b=>{
  const k = b.dataset.k;
  if (k==="up") bindHold(b,"up");
  if (k==="down") bindHold(b,"down");
  if (k==="left") bindHold(b,"left");
  if (k==="right") bindHold(b,"right");
});

// --- World
const World = await loadWorld(BUILD);
dbg("[main] world.js imported ✅");
await World.init({ THREE, scene, renderer, camera, player, controllers, log: dbg, BUILD });
dbg("[main] world init ✅");

// Menu actions
goLobby?.addEventListener("click", ()=>{ World.goRoom?.("lobby"); toggleMenu(false); });
goScorpion?.addEventListener("click", ()=>{ World.goRoom?.("scorpion"); toggleMenu(false); });
goStore?.addEventListener("click", ()=>{ World.goRoom?.("store"); toggleMenu(false); });
goSpectate?.addEventListener("click", ()=>{ World.goRoom?.("spectate"); toggleMenu(false); });
tpTable?.addEventListener("click", ()=>{ World.teleportToTable?.(); });

// Mobile buttons
mAction?.addEventListener("click", ()=> World.clickFromCamera?.());
mTeleport?.addEventListener("click", ()=> World.teleportFromCamera?.());
mTurnL?.addEventListener("click", ()=> { player.rotation.y += Math.PI/10; });
mTurnR?.addEventListener("click", ()=> { player.rotation.y -= Math.PI/10; });

// --- XR session start rebuild controllers + lasers (fix “laser in table”)
renderer.xr.addEventListener("sessionstart", ()=>{
  dbg("[main] XR sessionstart ✅");
  buildControllerArray();
  World.setControllers?.(controllers);
  World.rebuildLasers?.();
});
renderer.xr.addEventListener("sessionend", ()=>{
  dbg("[main] XR sessionend ✅");
});

// --- VRButton
(async ()=>{
  const VRButton = await loadVRButton();
  if (VRButton && navigator.xr) {
    document.body.appendChild(VRButton.createButton(renderer));
    dbg("[main] VRButton appended ✅");
  } else {
    dbg("[main] VRButton not available (ok)");
  }
})();

// --- Y button menu mapping (rising-edge detect)
let lastY = false;
function updateControllerButtonsForMenu(){
  // left controller gamepad if available via inputSource
  const left = controllers[0];
  const src = left?.inputSource;
  const gp = src?.gamepad;
  if (!gp || !gp.buttons || gp.buttons.length < 4) return;

  // Most common: button[3] is the top face button on that controller (X/Y depending on mapping).
  const pressed = !!gp.buttons[3]?.pressed;

  if (pressed && !lastY) toggleMenu();
  lastY = pressed;
}

// --- Non-XR D-pad movement
function updateNonXR(dt){
  const enable = isMobile && !renderer.xr.isPresenting;
  showMobilePad(enable);
  if (!enable) return;

  const speed = 2.1;
  const my = (mob.up ? 1 : 0) + (mob.down ? -1 : 0);
  const mx = (mob.right ? 1 : 0) + (mob.left ? -1 : 0);

  if (mx || my) {
    const yaw = player.rotation.y;
    const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
    const right   = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    const v = new THREE.Vector3();
    v.addScaledVector(forward, my);
    v.addScaledVector(right, mx);
    if (v.lengthSq() > 0.0001) {
      v.normalize().multiplyScalar(speed * dt);
      player.position.add(v);
    }
  }
}

// Render loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt = Math.min(clock.getDelta(), 0.05);
  updateControllerButtonsForMenu();
  if (!renderer.xr.isPresenting) updateNonXR(dt);
  World.update?.(dt);
  renderer.render(scene, camera);
});

window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
