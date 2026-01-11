// /js/index.js — FULL DIAGNOSTIC RUNTIME (UPLOAD THIS FILE)
// If this file is missing, boot.js import will fail and you’ll get a blank world.

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

const now = () => new Date().toTimeString().slice(0, 8);
const BUILD = "DIAG 1.0 (index.js restored)";

const perfEl = document.getElementById("perf");
const safeModeEl = document.getElementById("safeMode");
const dumpBtn = document.getElementById("dumpBtn");
const diagBtn = document.getElementById("diagBtn");
const panicBtn = document.getElementById("panicBtn");

function log(msg){
  console.log(msg);
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}
function tag(t,m){ log(`[${now()}] [${t}] ${m}`); }
function safe(t,fn){ try { return fn(); } catch(e){ console.error(e); tag(t, `ERROR ❌ ${e?.message || e}`); return null; } }

tag("index", `runtime start ✅ (${BUILD})`);
tag("index", `THREE.REVISION=${THREE.REVISION}`);

// ---------- renderer / gl ----------
const renderer = safe("gl", () => {
  const r = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.setSize(innerWidth, innerHeight);
  r.xr.enabled = true;
  document.body.appendChild(r.domElement);
  return r;
});

safe("gl", () => {
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  const rend   = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  tag("gl", `vendor=${vendor}`);
  tag("gl", `renderer=${rend}`);
  tag("gl", `maxTextureSize=${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
});

// ---------- scene / camera / player ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 600);
camera.position.set(0, 1.6, 6);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
player.position.set(0,0,0);
scene.add(player);

// lights
safe("lights", () => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.85);
  d.position.set(6, 12, 4);
  scene.add(d);
  tag("lights", "installed ✅");
});

// VR button
safe("vr", () => {
  document.body.appendChild(VRButton.createButton(renderer));
  tag("vr", "VRButton appended ✅");
});

// controllers + laser-only
const controllers = [];
safe("input", () => {
  for (let i=0;i<2;i++){
    const c = renderer.xr.getController(i);
    player.add(c);
    controllers.push(c);

    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff }));
    line.scale.z = 10;
    c.add(line);
  }
  tag("input", "controller rays installed ✅ (laser only)");
});

// ---------- android sticks ----------
const touch = { left:{id:null,x:0,y:0,active:false}, right:{id:null,x:0,y:0,active:false} };
function bindStick(el, key){
  const s = touch[key];
  const rect = () => el.getBoundingClientRect();
  const setFrom = (cx,cy)=>{
    const r = rect();
    const nx = (cx - (r.left + r.width*0.5)) / (r.width*0.5);
    const ny = (cy - (r.top  + r.height*0.5)) / (r.height*0.5);
    s.x = Math.max(-1, Math.min(1, nx));
    s.y = Math.max(-1, Math.min(1, ny));
  };
  el.addEventListener("touchstart", (e)=>{
    const t = e.changedTouches[0];
    s.id=t.identifier; s.active=true; setFrom(t.clientX,t.clientY);
    e.preventDefault();
  }, {passive:false});
  el.addEventListener("touchmove", (e)=>{
    for(const t of e.changedTouches){ if(t.identifier===s.id){ setFrom(t.clientX,t.clientY); break; } }
    e.preventDefault();
  }, {passive:false});
  const end = (e)=>{
    for(const t of e.changedTouches){ if(t.identifier===s.id){ s.id=null; s.active=false; s.x=0; s.y=0; break; } }
    e.preventDefault();
  };
  el.addEventListener("touchend", end, {passive:false});
  el.addEventListener("touchcancel", end, {passive:false});
}
safe("android", ()=>{
  const L = document.getElementById("stickL");
  const R = document.getElementById("stickR");
  if(L&&R){ bindStick(L,"left"); bindStick(R,"right"); tag("android","dual-stick ready ✅"); }
  else tag("android","dual-stick missing");
});

// ---------- world container ----------
const world = { group: new THREE.Group() };
scene.add(world.group);

function buildFallbackWorld(){
  while (world.group.children.length) world.group.remove(world.group.children[0]);
  const mat = new THREE.MeshStandardMaterial({ color: 0x14224a, roughness: 0.7, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20,0.2,20), new THREE.MeshStandardMaterial({ color: 0x070a14 }));
  world.group.add(floor);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2,2,2), mat);
  box.position.set(0,1,0);
  world.group.add(box);
  player.position.set(0,0,6);
  tag("fallback", "built ✅ (SAFE MODE)");
}

function buildWorld(){
  const safeMode = !!safeModeEl?.checked;
  while (world.group.children.length) world.group.remove(world.group.children[0]);

  if (safeMode){
    buildFallbackWorld();
    return;
  }

  tag("world", "calling World.build() …");
  const ok = safe("world", () => World.build({ THREE, scene, renderer, camera, player, controllers, world, tag, BUILD }));
  if (ok === null){
    tag("world", "World.build failed -> switching to SAFE MODE fallback");
    if (safeModeEl) safeModeEl.checked = true;
    buildFallbackWorld();
  } else {
    tag("world", "build complete ✅");
  }
}

buildWorld();

// HUD buttons
if (safeModeEl) safeModeEl.addEventListener("change", () => buildWorld());

if (dumpBtn) dumpBtn.onclick = () => dumpScene();
if (diagBtn) diagBtn.onclick = () => runDiagnostics();
if (panicBtn) panicBtn.onclick = () => {
  tag("panic", "reset requested");
  player.position.set(0,0,0);
  camera.position.set(0,1.6,6);
  tag("panic", "player/camera reset ✅");
};

function dumpScene(){
  let count = 0;
  const lines = [];
  scene.traverse((o)=>{
    count++;
    const name = o.name ? ` "${o.name}"` : "";
    lines.push(`${o.type}${name}`);
  });
  tag("dump", `scene objects=${count}`);
  lines.slice(0, 180).forEach(l => log(`[tree] ${l}`));
  if (count > 180) tag("dump", "tree truncated (showing 180)");
}

function runDiagnostics(){
  tag("diag", "=== RUN DIAGNOSTICS ===");
  tag("diag", `BUILD=${BUILD}`);
  tag("diag", `xrPresenting=${renderer.xr.isPresenting}`);
  tag("diag", `pixelRatio=${renderer.getPixelRatio?.()}`);
  tag("diag", `size=${innerWidth}x${innerHeight}`);
  try{
    const box = new THREE.Box3().setFromObject(world.group);
    const size = new THREE.Vector3(); box.getSize(size);
    const ctr  = new THREE.Vector3(); box.getCenter(ctr);
    tag("diag", `world bounds size=(${size.x.toFixed(2)},${size.y.toFixed(2)},${size.z.toFixed(2)})`);
    tag("diag", `world bounds center=(${ctr.x.toFixed(2)},${ctr.y.toFixed(2)},${ctr.z.toFixed(2)})`);
  }catch(e){
    tag("diag", `world bounds failed ❌ ${e?.message || e}`);
  }
  tag("diag", `controllers=${controllers.length}`);
  tag("diag", "=== END DIAGNOSTICS ===");
}

// resize
addEventListener("resize", ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  tag("gl", `resize -> ${innerWidth}x${innerHeight}`);
});

// movement/look loop
let lastT = performance.now();
let frameCount = 0, accTime = 0;

const tmpQ = new THREE.Quaternion();
const eul = new THREE.Euler(0,0,0,"YXZ");
const tmpV = new THREE.Vector3();

function yawFromCamera(){
  camera.getWorldQuaternion(tmpQ);
  eul.setFromQuaternion(tmpQ);
  return eul.y;
}

renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.033, (t - lastT)/1000);
  lastT = t;

  // perf
  frameCount++;
  accTime += dt;
  if (accTime >= 1.0){
    const fps = frameCount / accTime;
    if (perfEl) perfEl.textContent = `Perf: ${fps.toFixed(0)} fps`;
    frameCount = 0; accTime = 0;
  }

  const moveX = touch.left.x;
  const moveZ = -touch.left.y;
  const lookX = touch.right.x;
  const lookY = touch.right.y;

  // look when not XR
  if (!renderer.xr.isPresenting){
    camera.getWorldQuaternion(tmpQ);
    eul.setFromQuaternion(tmpQ);
    eul.y -= lookX * 1.8 * dt;
    eul.x = THREE.MathUtils.clamp(eul.x - lookY * 1.2 * dt, -1.2, 1.2);
    eul.z = 0;
    camera.quaternion.setFromEuler(eul);
  }

  // walk
  const yaw = yawFromCamera();
  const fwd = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const rgt = new THREE.Vector3(fwd.z,0,-fwd.x);

  tmpV.set(0,0,0);
  tmpV.addScaledVector(fwd, moveZ);
  tmpV.addScaledVector(rgt, moveX);
  if (tmpV.lengthSq() > 1e-6) tmpV.normalize().multiplyScalar(3.0 * dt);

  player.position.add(tmpV);
  player.position.y = 0;

  safe("world", () => World.update?.({ dt, time: t/1000 }));

  renderer.render(scene, camera);
});

tag("index", "ready ✅");
