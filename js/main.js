// /js/main.js — Update 9.0 Core Boot (Controller Fix + Teleport Circle)
// - local-floor reference space
// - no rays/lasers
// - trigger-hold teleport ring + stick steering
// - snap turn 45°
// - stable standing height

import * as T from "./three.js";
const THREE = T;

import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";
import { ControllerAnchor } from "./controller_anchor.js";

let renderer, scene, camera, rig, clock;

let controllerL, controllerR;
let gripL, gripR;

let sim = null;

const snapAngle = THREE.MathUtils.degToRad(45);
const snapCooldown = 0.28;
let lastSnap = 0;

const MOVE_DEADZONE = 0.18;
const TELEPORT_STEER_SPEED = 2.4;     // meters/sec
const TELEPORT_MAX_RADIUS = 9.0;

let teleport = {
  active: false,
  target: new THREE.Vector3(0, 0, 2.8),
  ring: null,
};

function $(id){ return document.getElementById(id); }
function logLine(s){
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}

function ensureAppContainer() {
  return document.getElementById("app") || document.body;
}

function buildRenderer(){
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  // IMPORTANT: stable floor behavior on Quest
  renderer.xr.setReferenceSpaceType("local-floor");

  ensureAppContainer().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

function buildScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 3, 70);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 260);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Extra safety lighting (World adds more)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.55));
}

function buildControllers(){
  controllerL = renderer.xr.getController(0);
  controllerR = renderer.xr.getController(1);
  scene.add(controllerL, controllerR);

  const factory = new XRControllerModelFactory();

  gripL = renderer.xr.getControllerGrip(0);
  gripR = renderer.xr.getControllerGrip(1);

  gripL.add(factory.createControllerModel(gripL));
  gripR.add(factory.createControllerModel(gripR));

  scene.add(gripL, gripR);

  // Trigger teleport: press/hold start, release commit
  controllerL.addEventListener("selectstart", () => teleportStart());
  controllerL.addEventListener("selectend", () => teleportEnd());

  controllerR.addEventListener("selectstart", () => teleportStart());
  controllerR.addEventListener("selectend", () => teleportEnd());
}

function makeTeleportRing(){
  const g = new THREE.Group();
  g.name = "TeleportRing";

  const ringMatA = new THREE.MeshStandardMaterial({
    color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.2, roughness: 0.25
  });
  const ringMatB = new THREE.MeshStandardMaterial({
    color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 0.9, roughness: 0.25
  });
  const ringMatC = new THREE.MeshStandardMaterial({
    color: 0x2bd7ff, emissive: 0x2bd7ff, emissiveIntensity: 0.9, roughness: 0.25
  });

  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 12, 64), ringMatA);
  r1.rotation.x = Math.PI / 2;
  r1.position.y = 0.02;

  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 12, 64), ringMatB);
  r2.rotation.x = Math.PI / 2;
  r2.position.y = 0.03;

  const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 12, 64), ringMatC);
  r3.rotation.x = Math.PI / 2;
  r3.position.y = 0.04;

  const glow = new THREE.PointLight(0x00ffaa, 0.65, 6);
  glow.position.set(0, 1.2, 0);

  g.add(r1, r2, r3, glow);
  g.visible = false;
  return g;
}

function teleportStart(){
  teleport.active = true;
  if (teleport.ring) teleport.ring.visible = true;

  // Start at current rig position
  teleport.target.set(rig.position.x, 0, rig.position.z);
  if (teleport.ring) teleport.ring.position.set(teleport.target.x, 0.01, teleport.target.z);
}

function teleportEnd(){
  if (!teleport.active) return;
  teleport.active = false;
  if (teleport.ring) teleport.ring.visible = false;

  // Commit teleport
  rig.position.x = teleport.target.x;
  rig.position.z = teleport.target.z;
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

    // common: [x,y] or [x,y,x2,y2]
    if (ax.length >= 4) return { x: ax[2] || 0, y: ax[3] || 0 };
    return { x: ax[0] || 0, y: ax[1] || 0 };
  }
  return { x:0, y:0 };
}

function applySnapTurn(){
  if (!renderer.xr.isPresenting) return;

  const right = getAxes("right");
  const rx = Math.abs(right.x) > MOVE_DEADZONE ? right.x : 0;

  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastSnap) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastSnap = now;
  } else if (rx < -0.72 && (now - lastSnap) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastSnap = now;
  }
}

function applyTeleportSteer(dt){
  if (!renderer.xr.isPresenting) return;
  if (!teleport.active) return;

  // Steering target with LEFT stick
  const left = getAxes("left");
  let lx = Math.abs(left.x) > MOVE_DEADZONE ? left.x : 0;
  let ly = Math.abs(left.y) > MOVE_DEADZONE ? left.y : 0;

  // FIX: forward should be forward on stick
  // Most gamepads report up as -1
  const forward = -ly;
  const strafe  = lx;

  // Use headset yaw (stable)
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;

  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const vx = (strafe * cos + forward * sin) * TELEPORT_STEER_SPEED * dt;
  const vz = (forward * cos - strafe * sin) * TELEPORT_STEER_SPEED * dt;

  teleport.target.x += vx;
  teleport.target.z += vz;

  // Clamp radius from origin spawn pad so it stays inside room
  const origin = World.spawnPadPos || new THREE.Vector3(0,0,2.8);
  const dx = teleport.target.x - origin.x;
  const dz = teleport.target.z - origin.z;
  const dist = Math.sqrt(dx*dx + dz*dz);
  if (dist > TELEPORT_MAX_RADIUS) {
    const s = TELEPORT_MAX_RADIUS / dist;
    teleport.target.x = origin.x + dx * s;
    teleport.target.z = origin.z + dz * s;
  }

  if (teleport.ring) teleport.ring.position.set(teleport.target.x, 0.01, teleport.target.z);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function hookHUDButtons(){
  const reset = () => {
    const p = World.spawnPadPos || new THREE.Vector3(0,0,2.8);
    rig.position.set(p.x, 0, p.z);
    rig.rotation.y = 0;
    logLine("↩ Reset spawn.");
  };
  $("#btnReset")?.addEventListener("click", reset);

  $("#btnLobby")?.addEventListener("click", () => UI.toast("Lobby (placeholder)"));
  $("#btnPoker")?.addEventListener("click", () => UI.toast("Poker (spectator sim running)"));
  $("#btnStore")?.addEventListener("click", () => UI.toast("Store (placeholder scaffold)"));
}

export async function boot(){
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();
  window.addEventListener("resize", onResize);

  UI.init({ logLine });
  hookHUDButtons();

  logLine("VIP boot running… (9.0)");

  // World
  World.build(scene, rig);

  // Teleport ring (always available on trigger hold)
  teleport.ring = makeTeleportRing();
  scene.add(teleport.ring);

  // Controller anchor (YES — do it)
  ControllerAnchor.install({
    scene, rig, camera,
    gripL, gripR,
    controllerL, controllerR,
    logLine
  });

  // Poker sim
  sim = new PokerSimulation({
    camera,
    tableCenter: World.tableCenter,
    onLeaderboard: (lines) => UI.updateLeaderboard(lines),
  });
  await sim.build(scene);

  logLine("boot() finished");

  renderer.xr.addEventListener("sessionstart", () => logLine("✅ XR session started"));
  renderer.xr.addEventListener("sessionend", () => logLine("ℹ️ XR session ended"));

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    // anchor first (keeps things sane)
    ControllerAnchor.update(dt);

    // 9.0 movement: teleport steering + snap turn
    applyTeleportSteer(dt);
    applySnapTurn();

    // sim update
    if (sim) sim.update(dt);

    // world update
    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
