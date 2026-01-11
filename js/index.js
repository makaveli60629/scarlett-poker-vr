// js/index.js — Scarlett Android Boot v5.0 (FULL)
// ✅ Always renders a base scene (never black/frozen)
// ✅ Android Touch: left move, right look
// ✅ Works even if world.js fails
// ✅ Buttons: EnterVR, Respawn Safe, Snap Down, Table, Copy Log

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const BUILD = Date.now();
const overlay = document.getElementById("log");
const LOG = [];
const LOG_MAX = 2500;

function pushLog(line){ LOG.push(line); if (LOG.length > LOG_MAX) LOG.shift(); }
function write(line, cls="muted"){
  const s = String(line);
  pushLog(s);
  if (!overlay) return;
  const div = document.createElement("div");
  div.className = `row ${cls}`;
  div.textContent = s;
  overlay.appendChild(div);
  overlay.scrollTop = overlay.scrollHeight;
}
const ok  = (m)=>write(`✅ ${m}`,"ok");
const warn= (m)=>write(`⚠️ ${m}`,"warnT");
const bad = (m)=>write(`❌ ${m}`,"badT");

window.SCARLETT = {
  async copyLog(){
    const text = LOG.join("\n");
    try { await navigator.clipboard.writeText(text); ok("Copied log ✅"); }
    catch{ warn("Clipboard blocked — long-press select the log."); }
  },
  respawnSafe(){},
  snapDown(){},
  gotoTable(){}
};

window.addEventListener("error",(e)=>{
  bad(`WINDOW ERROR: ${e?.message||"error"}${e?.filename?` @ ${e.filename}:${e.lineno}:${e.colno}`:""}`);
  if (e?.error?.stack) write(e.error.stack,"badT");
});
window.addEventListener("unhandledrejection",(e)=>{
  bad("UNHANDLED PROMISE REJECTION");
  const r=e?.reason; bad(r?.message||String(r)); if (r?.stack) write(r.stack,"badT");
});

write(`BUILD_STAMP: ${BUILD}`);
write(`HREF: ${location.href}`);
write(`UA: ${navigator.userAgent}`);
write(`NAVIGATOR_XR: ${!!navigator.xr}`);
write(`THREE: module ok`);

// ---------------------------
// Renderer + base scene
// ---------------------------
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
ok("Renderer created");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(4, 10, 3);
scene.add(dir);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
);
floor.rotation.x = -Math.PI/2;
floor.position.y = 0;
floor.name = "Floor";
scene.add(floor);

// landmark cube so you ALWAYS see motion
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.2,1.2,1.2),
  new THREE.MeshStandardMaterial({ color: 0xb01852, roughness: 0.6, metalness: 0.1 })
);
cube.position.set(0, 1.2, -3.2);
scene.add(cube);

const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 800);
camera.position.set(0, 1.65, 0);
player.add(camera);
ok("PlayerRig + Camera created");

// hands placeholders (safe)
const handLeft = renderer.xr.getHand(0);
const handRight = renderer.xr.getHand(1);
handLeft.name="HandLeft"; handRight.name="HandRight";
player.add(handLeft); player.add(handRight);
ok("XR Hands placeholders ready");

// VRButton
try{
  const btn = VRButton.createButton(renderer);
  btn.id="VRButton";
  document.body.appendChild(btn);
  ok("VRButton appended");
}catch(e){
  warn("VRButton failed: " + (e?.message||e));
}

// responsive
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------
// Android Touch Controls
// left side = move stick
// right side = look stick
// ---------------------------
const touch = {
  moveId: null,
  lookId: null,
  moveStart: new THREE.Vector2(),
  lookStart: new THREE.Vector2(),
  move: new THREE.Vector2(),
  look: new THREE.Vector2(),
  yaw: 0,
  pitch: 0
};

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function onPointerDown(e){
  // ignore if pressing UI buttons
  const t = e.target;
  if (t && (t.closest?.("#dock") || t.closest?.("#bar") || t.closest?.("#dbg"))) return;

  const x = e.clientX;
  const isLeft = x < (window.innerWidth * 0.5);

  if (isLeft && touch.moveId === null){
    touch.moveId = e.pointerId;
    touch.moveStart.set(e.clientX, e.clientY);
    touch.move.set(0,0);
  } else if (!isLeft && touch.lookId === null){
    touch.lookId = e.pointerId;
    touch.lookStart.set(e.clientX, e.clientY);
    touch.look.set(0,0);
  }
}

function onPointerMove(e){
  if (e.pointerId === touch.moveId){
    const dx = e.clientX - touch.moveStart.x;
    const dy = e.clientY - touch.moveStart.y;
    // normalize to [-1..1] roughly
    touch.move.set(clamp(dx/90, -1, 1), clamp(dy/90, -1, 1));
  } else if (e.pointerId === touch.lookId){
    const dx = e.clientX - touch.lookStart.x;
    const dy = e.clientY - touch.lookStart.y;
    touch.look.set(clamp(dx/110, -1, 1), clamp(dy/110, -1, 1));
  }
}

function onPointerUp(e){
  if (e.pointerId === touch.moveId){
    touch.moveId = null;
    touch.move.set(0,0);
  }
  if (e.pointerId === touch.lookId){
    touch.lookId = null;
    touch.look.set(0,0);
  }
}

renderer.domElement.addEventListener("pointerdown", onPointerDown, {passive:true});
renderer.domElement.addEventListener("pointermove", onPointerMove, {passive:true});
renderer.domElement.addEventListener("pointerup", onPointerUp, {passive:true});
renderer.domElement.addEventListener("pointercancel", onPointerUp, {passive:true});

ok("Android touch controls ready ✅ (Left=Move, Right=Look)");

// buttons
window.SCARLETT.respawnSafe = () => {
  player.position.set(0, 0.02, 26);
  camera.position.set(0, 1.65, 0);
  touch.yaw = 0;
  touch.pitch = 0;
  player.rotation.set(0,0,0);
  camera.rotation.set(0,0,0);
  ok("RESPAWN SAFE");
};

window.SCARLETT.snapDown = () => {
  player.position.y = 0.02;
  camera.position.set(0,1.65,0);
  ok("SNAP DOWN");
};

window.SCARLETT.gotoTable = () => {
  // “table-ish” default spot. Your world can override later.
  player.position.set(0, 0.02, 2.6);
  ok("TABLE (gotoTable)");
};

// ---------------------------
// Load HybridWorld (optional)
// ---------------------------
let HybridWorld = null;
(async ()=>{
  try{
    const mod = await import(`./world.js?v=5001`);
    HybridWorld = mod?.HybridWorld || null;
    ok("world.js imported ✅");
  }catch(e){
    bad("world.js import FAIL: " + (e?.message||e));
    if (e?.stack) write(e.stack,"badT");
  }

  if (HybridWorld?.build){
    try{
      await HybridWorld.build({
        THREE, renderer, camera, player,
        controllers: { handLeft, handRight },
        log: (...a)=>write(a.map(String).join(" "), "muted"),
        OPTS: { nonvrControls:true, allowTeleport:true, allowBots:true, allowPoker:true, safeMode:false }
      });
      ok("HybridWorld.build ✅");
    }catch(e){
      bad("HybridWorld.build FAILED: " + (e?.message||e));
      if (e?.stack) write(e.stack,"badT");
    }
  } else {
    warn("HybridWorld not available — base scene only");
  }
})();

// ---------------------------
// Main loop (never freezes)
// ---------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt = Math.min(0.05, clock.getDelta());

  // animate cube so you can SEE the loop
  cube.rotation.y += dt * 0.7;
  cube.rotation.x += dt * 0.35;

  // touch move/look ONLY when not in XR
  if (!renderer.xr.isPresenting){
    // look
    touch.yaw   -= touch.look.x * dt * 2.4;
    touch.pitch -= touch.look.y * dt * 2.0;
    touch.pitch = clamp(touch.pitch, -1.2, 1.2);
    player.rotation.y = touch.yaw;
    camera.rotation.x = touch.pitch;

    // move
    const fwd = -touch.move.y;   // up screen = forward
    const str =  touch.move.x;

    if (Math.abs(fwd) + Math.abs(str) > 0.02){
      const speed = 3.2;
      const dir = new THREE.Vector3();
      player.getWorldDirection(dir);
      dir.y = 0; dir.normalize();
      const right = new THREE.Vector3(dir.z, 0, -dir.x);

      player.position.addScaledVector(dir, fwd * speed * dt);
      player.position.addScaledVector(right, str * speed * dt);
      player.position.y = Math.max(0.02, player.position.y);
    }
  }

  // world update (if available)
  try{
    HybridWorld?.frame?.({ renderer, camera });
  }catch(e){
    bad("HybridWorld.frame crash: " + (e?.message||e));
    if (e?.stack) write(e.stack,"badT");
    HybridWorld = null; // drop back to base
  }

  // always render something visible
  if (!HybridWorld?.frame){
    renderer.render(scene, camera);
  }
});

ok("Animation loop running ✅");
