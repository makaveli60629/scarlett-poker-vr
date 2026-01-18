// SCARLETT1 — QuickWalk v2.0 (XR + teleport + stick locomotion + table demo)
// Build: SCARLETT1_QUICKWALK_v2_0

const BUILD = "SCARLETT1_QUICKWALK_v2_0";
const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m);}catch(_){ console.log(m);} };

dwrite(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettEngineAttached = true;

// ---- SAFE CONSTS (never redeclare crash) ----
globalThis.SCARLETT_CONSTS ||= {};
globalThis.SCARLETT_CONSTS.SUITS ||= Object.freeze(["S","H","D","C"]);
globalThis.SCARLETT_CONSTS.RANKS ||= Object.freeze(["A","K","Q","J","10","9","8","7","6","5","4","3","2"]);
const SUITS = globalThis.SCARLETT_CONSTS.SUITS;
const RANKS = globalThis.SCARLETT_CONSTS.RANKS;

// ---- Modules ----
import { initAudio } from "../modules/audio.js";
initAudio(dwrite);

// ---- Three.js (CDN; keeps zip small; works on Quest) ----
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

const app = document.getElementById("app");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 80);

// Player rig so we can teleport/move
const rig = new THREE.Group();
rig.position.set(0, 1.6, 3.2);
rig.add(camera);
scene.add(rig);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 2);
scene.add(dir);

// Floor
const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 1, metalness: 0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI/2;
floor.position.y = 0;
floor.receiveShadow = false;
scene.add(floor);

// Walls (simple room)
function wall(w,h, x,y,z, ry){
  const g = new THREE.PlaneGeometry(w,h);
  const m = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 1 });
  const mesh = new THREE.Mesh(g,m);
  mesh.position.set(x,y,z);
  mesh.rotation.y = ry;
  scene.add(mesh);
  return mesh;
}
wall(60, 8, 0, 4, -30, 0);
wall(60, 8, 0, 4,  30, Math.PI);
wall(60, 8, -30, 4, 0, Math.PI/2);
wall(60, 8,  30, 4, 0, -Math.PI/2);

// Table (3D)
const table = new THREE.Group();
scene.add(table);

const tableTop = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 0.12, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x0c2b18, roughness: 1 })
);
tableTop.position.set(0, 1.0, 0);

const rail = new THREE.Mesh(
  new THREE.BoxGeometry(2.28, 0.08, 1.48),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 })
);
rail.position.set(0, 1.06, 0);

table.add(rail);
table.add(tableTop);

// Center marker
const marker = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18),
  new THREE.MeshStandardMaterial({ color: 0x7b1b1b, roughness: 1 })
);
marker.position.set(0, 1.07, 0);
table.add(marker);

// Bots + cards (billboard sprites)
const bots = Array.from({length:6}).map((_,i)=>({
  name:`BOT_${i+1}`,
  seat:i,
  chips: 1000 + i*250,
  cards:[
    { r: RANKS[(i*2)%RANKS.length], s: SUITS[i%SUITS.length] },
    { r: RANKS[(i*2+7)%RANKS.length], s: SUITS[(i+1)%SUITS.length] }
  ]
}));

function makeLabel(text){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)';
  g.clearRect(0,0,c.width,c.height);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = '28px ui-monospace, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width/2, c.height/2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(0.45, 0.225, 1);
  return spr;
}

const botGroup = new THREE.Group();
scene.add(botGroup);

for (const b of bots){
  const ang = (b.seat / bots.length) * Math.PI*2 - Math.PI/2;
  const rx = Math.cos(ang) * 1.05;
  const rz = Math.sin(ang) * 0.7;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.35, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8c0ff, roughness: 1 })
  );
  body.position.set(rx, 1.25, rz);
  body.lookAt(0, 1.25, 0);
  botGroup.add(body);

  const nameSpr = makeLabel(b.name);
  nameSpr.position.set(rx, 1.55, rz);
  botGroup.add(nameSpr);

  // flat cards
  const c1 = makeLabel(`${b.cards[0].r}${b.cards[0].s}`);
  const c2 = makeLabel(`${b.cards[1].r}${b.cards[1].s}`);
  c1.position.set(rx - 0.12, 1.09, rz + 0.02);
  c2.position.set(rx + 0.12, 1.09, rz + 0.02);
  c1.material.depthTest = true;
  c2.material.depthTest = true;
  botGroup.add(c1); botGroup.add(c2);

  // hover mirror cards
  const h1 = makeLabel(`${b.cards[0].r}${b.cards[0].s}`);
  const h2 = makeLabel(`${b.cards[1].r}${b.cards[1].s}`);
  h1.position.set(rx - 0.12, 1.38, rz);
  h2.position.set(rx + 0.12, 1.38, rz);
  botGroup.add(h1); botGroup.add(h2);
}

window.SCARLETT.game = {
  phase: "A",
  bots,
  deal(){
    for (const b of bots){
      b.cards = [
        { r: RANKS[Math.floor(Math.random()*RANKS.length)], s: SUITS[Math.floor(Math.random()*SUITS.length)] },
        { r: RANKS[Math.floor(Math.random()*RANKS.length)], s: SUITS[Math.floor(Math.random()*SUITS.length)] },
      ];
    }
    window.__scarlettAudioPlay?.("deal");
    dwrite("[game] deal ✅");
  }
};
setTimeout(()=>window.SCARLETT.game.deal(), 650);

// Controllers
const controllerModelFactory = new XRControllerModelFactory();

const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
rig.add(controller1);
rig.add(controller2);

const grip1 = renderer.xr.getControllerGrip(0);
grip1.add(controllerModelFactory.createControllerModel(grip1));
rig.add(grip1);

const grip2 = renderer.xr.getControllerGrip(1);
grip2.add(controllerModelFactory.createControllerModel(grip2));
rig.add(grip2);

// Teleport ray
const rayMat = new THREE.LineBasicMaterial({ color: 0x66ccff });
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const rayLine = new THREE.Line(rayGeom, rayMat);
rayLine.name = "teleportRay";
rayLine.scale.z = 6;
controller1.add(rayLine.clone());
controller2.add(rayLine.clone());

const raycaster = new THREE.Raycaster();
const tempMat4 = new THREE.Matrix4();

function getIntersection(ctrl){
  tempMat4.identity().extractRotation(ctrl.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
  raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat4);
  const hits = raycaster.intersectObject(floor, false);
  return hits[0] || null;
}

function doTeleport(ctrl){
  if (!window.SCARLETT?.teleportOn) return;
  const hit = getIntersection(ctrl);
  if (!hit) return;
  // Move rig so camera ends up at hit point
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const rigPos = new THREE.Vector3();
  rig.getWorldPosition(rigPos);
  const delta = new THREE.Vector3().subVectors(hit.point, camPos);
  rig.position.add(delta);
  // Keep height reasonable
  rig.position.y = Math.max(0, rig.position.y);
  window.__scarlettAudioPlay?.("teleport");
}

controller1.addEventListener('selectstart', ()=>doTeleport(controller1));
controller2.addEventListener('selectstart', ()=>doTeleport(controller2));

// Stick locomotion
const vForward = new THREE.Vector3();
const vRight = new THREE.Vector3();

function applySticks(dt){
  if (!window.SCARLETT?.sticksOn) return;
  const session = renderer.xr.getSession();
  if (!session) return;

  // choose first input with gamepad
  let gp = null;
  for (const src of session.inputSources) {
    if (src?.gamepad) { gp = src.gamepad; break; }
  }
  if (!gp) return;

  // Convention: axes[2,3] often right stick on Quest; axes[0,1] left stick
  const lx = gp.axes?.[0] ?? 0;
  const ly = gp.axes?.[1] ?? 0;
  const rx = gp.axes?.[2] ?? 0;

  const dead = 0.12;
  const ax = Math.abs(lx) > dead ? lx : 0;
  const ay = Math.abs(ly) > dead ? ly : 0;
  const turn = Math.abs(rx) > dead ? rx : 0;

  // yaw from camera direction
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  vForward.copy(dir);
  vRight.set(-dir.z, 0, dir.x);

  const speed = 2.0; // m/s
  rig.position.addScaledVector(vForward, (-ay) * speed * dt);
  rig.position.addScaledVector(vRight, (ax) * speed * dt);

  // snap-ish smooth turn
  rig.rotation.y -= turn * 1.8 * dt;
}

// Non-VR touch look + tap-to-move
let dragging=false, lastX=0, lastY=0;
let yaw=0, pitch=0;

renderer.domElement.addEventListener('pointerdown', (e)=>{ dragging=true; lastX=e.clientX; lastY=e.clientY; window.__scarlettAudioPlay?.('click'); });
renderer.domElement.addEventListener('pointerup', ()=>{ dragging=false; });
renderer.domElement.addEventListener('pointermove', (e)=>{
  if (!dragging) return;
  const dx = e.clientX-lastX, dy=e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  yaw += dx*0.003;
  pitch += dy*0.002;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));
  camera.rotation.set(-pitch, yaw, 0);
});

renderer.domElement.addEventListener('click', (e)=>{
  // approximate tap-to-move on floor when not in XR
  if (renderer.xr.getSession()) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((e.clientX-rect.left)/rect.width) * 2 - 1;
  const y = -(((e.clientY-rect.top)/rect.height) * 2 - 1);
  raycaster.setFromCamera({x,y}, camera);
  const hit = raycaster.intersectObject(floor, false)[0];
  if (!hit) return;
  rig.position.x = hit.point.x;
  rig.position.z = hit.point.z;
  window.__scarlettAudioPlay?.('teleport');
});

// XR entry
window.__scarlettEnterVR = async () => {
  if (!navigator.xr) { dwrite("[xr] navigator.xr not available"); return; }
  const ok = await navigator.xr.isSessionSupported?.('immersive-vr');
  if (ok === false) { dwrite("[xr] immersive-vr not supported"); return; }

  const session = await navigator.xr.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers']
  });

  session.addEventListener('end', ()=>dwrite('[xr] session ended'));
  await renderer.xr.setSession(session);
  dwrite('[xr] session started ✅');
  window.__scarlettAudioPlay?.('click');
};

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize, { passive:true });

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;

  // Teleport ray visibility
  const inXR = !!renderer.xr.getSession();
  controller1.getObjectByName('teleportRay')?.visible = inXR && !!window.SCARLETT?.teleportOn;
  controller2.getObjectByName('teleportRay')?.visible = inXR && !!window.SCARLETT?.teleportOn;

  applySticks(dt);
  renderer.render(scene, camera);
});

dwrite('[status] renderer OK ✅');
dwrite('[status] world ready ✅');
dwrite('[status] MODULE TEST ✅');
