// js/main.js — VIP Room Core Boot (8.2.5 Controller Lock)
// FIX:
// - Controllers/grips are parented to RIG so they never "stay behind"
// - Right-hand ray + floor reticle + trigger teleport
// - Left stick forward/back corrected (Quest forward is typically -Y; you reported reverse, so we flip)

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

const MOVE_SPEED = 2.25;
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

  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.1);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(4, 10, 3);
  scene.add(dir);
}

function makeRayLine(){
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,0,-1),
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 14;
  line.visible = false;

  // natural slight downward angle so you don't have to aim at the sky
  line.rotation.x = -THREE.MathUtils.degToRad(10);
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

function buildControllers(){
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);

  // IMPORTANT FIX: parent controllers to rig so locomotion/teleport keeps them with you
  rig.add(controller0);
  rig.add(controller1);

  const modelFactory = new XRControllerModelFactory();

  grip0 = renderer.xr.getControllerGrip(0);
  grip0.add(modelFactory.createControllerModel(grip0));
  rig.add(grip0);

  grip1 = renderer.xr.getControllerGrip(1);
  grip1.add(modelFactory.createControllerModel(grip1));
  rig.add(grip1);

  ray0 = makeRayLine();
  ray1 = makeRayLine();
  grip0.add(ray0);
  grip1.add(ray1);

  reticle = buildReticle();

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller1 connected"); });

  controller0.addEventListener("disconnected", () => { ray0.visible = false; });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; });

  controller0.addEventListener("selectstart", () => onSelect());
  controller1.addEventListener("selectstart", () => onSelect());
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
    return { x: gp.axes[0] || 0, y: gp.axes[1] || 0 };
  }
  return { x:0, y:0 };
}

function dz(v){ return Math.abs(v) > DEADZONE ? v : 0; }

function applyLocomotion(dt){
  if (!renderer.xr.isPresenting) return;

  const left = getAxes("left");
  const right = getAxes("right");

  const lx = dz(left.x);
  const ly = dz(left.y);
  const rx = dz(right.x);

  // YOUR REPORT: forward/back was reversed.
  // Quest forward is typically y = -1, so normal is forward = -ly.
  // We flip so your forward becomes forward:
  const forward = ly;    // <-- flipped
  const strafe  = lx;

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * MOVE_SPEED * dt;

  rig.position.x += vx;
  rig.position.z += vz;

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
  if (!renderer.xr.isPresenting) { reticle.visible = false; return; }
  if (!grip1) { reticle.visible = false; return; }

  tmpMat.identity().extractRotation(grip1.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(grip1.matrixWorld);
  const dir = new THREE.Vector3(0,0,-1).applyMatrix4(tmpMat).normalize();

  raycaster.set(origin, dir);

  const floor = scene.getObjectByName("Floor");
  if (!floor) { reticle.visible = false; return; }

  const hits = raycaster.intersectObject(floor, true);
  if (!hits.length) { reticle.visible = false; return; }

  const p = hits[0].point;
  reticle.visible = true;
  reticle.position.set(p.x, 0.01, p.z);
}

function onSelect(){
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
