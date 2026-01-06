// js/main.js — VIP Room Core Boot (8.2.4 Control Lock)
// Fixes:
// - Left stick forward/back corrected (forward is forward)
// - Right-hand ray points slightly down (not upward)
// - Floor reticle attaches to RIGHT controller ray
// - Trigger teleports to reticle
// - Simple 3D menu panel (Lobby / Poker / Store) clickable with ray+trigger

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

let renderer, scene, camera, rig, clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let reticle;
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.2;

// movement axis tuning
const DEADZONE = 0.18;

function $(id){ return document.getElementById(id); }
function logLine(s){
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}

function ensureAppContainer(){
  return document.getElementById("app") || document.body;
}

function buildRenderer(){
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  ensureAppContainer().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

function buildScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 2, 75);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // baseline lighting (World also adds its own)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.1);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(4, 10, 3);
  scene.add(dir);
}

function makeRayLine(){
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,0,-1)
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 12;
  line.visible = false;

  // IMPORTANT: slight downward pitch so it naturally points toward floor
  line.rotation.x = -THREE.MathUtils.degToRad(12);

  return line;
}

function buildReticle(){
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.16, 40),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.75, side:THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  ring.renderOrder = 999;
  scene.add(ring);
  return ring;
}

function buildMenuPanel(){
  // simple panel floating near spawn; click with right-hand ray + trigger
  const panel = new THREE.Group();
  panel.name = "MenuPanel";
  panel.position.set(0, 1.55, 4.15);
  panel.rotation.y = Math.PI;

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d13,
      roughness: 0.9,
      emissive: 0x001a12,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.95,
    })
  );
  panel.add(bg);

  const mkBtn = (label, x) => {
    const tex = (() => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(8,10,16,0.85)";
      ctx.fillRect(0,0,512,256);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0,255,170,0.55)";
      ctx.strokeRect(18,18,476,220);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,60,120,0.40)";
      ctx.strokeRect(30,30,452,196);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "900 72px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 256, 130);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    })();

    const btn = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.18),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    btn.position.set(x, 0, 0.01);
    btn.userData.isMenuButton = true;
    btn.userData.label = label;
    panel.add(btn);
    return btn;
  };

  mkBtn("LOBBY", -0.37);
  mkBtn("POKER", 0.00);
  mkBtn("STORE", 0.37);

  scene.add(panel);
  return panel;
}

let menuPanel;

function buildControllers(){
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);
  scene.add(controller0);
  scene.add(controller1);

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  scene.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  scene.add(grip1);

  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  reticle = buildReticle();
  menuPanel = buildMenuPanel();

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });

  controller0.addEventListener("disconnected", () => { ray0.visible = false; });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; });

  // Trigger selects menu OR teleports
  controller0.addEventListener("selectstart", () => onSelect(0));
  controller1.addEventListener("selectstart", () => onSelect(1));
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getXRSession(){
  return renderer?.xr?.getSession?.() || null;
}

function getAxes(handedness){
  const session = getXRSession();
  if (!session) return { x:0, y:0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    // most Quest sources report [x,y] for stick as first two
    return { x: ax[0] || 0, y: ax[1] || 0 };
  }
  return { x:0, y:0 };
}

function dead(v){ return Math.abs(v) > DEADZONE ? v : 0; }

function applyLocomotion(dt){
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const lx = dead(left.x);
  const ly = dead(left.y);
  const rx = dead(right.x);

  // FIX: your forward/back was reversed. On Quest, pushing forward usually gives y = -1.
  // So forward should be (-ly), but you reported it's reversed, meaning your system is opposite.
  // We flip to forward = (ly) to match your report.
  const forward = ly;      // <-- KEY FIX (was -ly)
  const strafe = lx;

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;

  // Snap turn
  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }
}

function updateReticle(){
  // Always drive reticle from RIGHT controller ray (grip1)
  if (!renderer.xr.isPresenting) { reticle.visible = false; return; }
  if (!grip1) { reticle.visible = false; return; }

  // Ray origin/direction from grip1
  tmpMat.identity().extractRotation(grip1.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(grip1.matrixWorld);
  const dir = new THREE.Vector3(0,0,-1).applyMatrix4(tmpMat).normalize();

  raycaster.set(origin, dir);

  // Intersect floor if World built it
  const floor = scene.getObjectByName("Floor");
  if (!floor) { reticle.visible = false; return; }

  const hits = raycaster.intersectObject(floor, true);
  if (!hits.length) { reticle.visible = false; return; }

  const p = hits[0].point;
  reticle.visible = true;
  reticle.position.set(p.x, 0.01, p.z);
}

function onSelect(handIndex){
  // Use right-hand ray for interaction even if left trigger pressed (simplifies)
  if (!renderer.xr.isPresenting) return;

  tmpMat.identity().extractRotation(grip1.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(grip1.matrixWorld);
  const dir = new THREE.Vector3(0,0,-1).applyMatrix4(tmpMat).normalize();
  raycaster.set(origin, dir);

  // 1) Menu click?
  const menuHits = raycaster.intersectObjects(menuPanel.children, true)
    .filter(h => h.object?.userData?.isMenuButton);

  if (menuHits.length) {
    const label = menuHits[0].object.userData.label;
    logLine(`🟩 Menu: ${label}`);
    // For now, just logs. Later we’ll actually switch scenes/modules.
    return;
  }

  // 2) Teleport to reticle
  if (reticle?.visible) {
    rig.position.set(reticle.position.x, 0, reticle.position.z);
  }
}

export async function boot(){
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);

  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateReticle();

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
