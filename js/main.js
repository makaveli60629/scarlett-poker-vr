// js/main.js — VIP Room Core Boot (8.1.0)
// FIX/ADD:
// - HARD-FIX ray orientation: always aims down to the floor (no more "laser up")
// - Controllers/grips parented to rig (stay with you)
// - Teleport with ring marker, trigger to teleport
// - Snap turn 45° on right stick
// - Simple in-world VR menu: Lobby / Poker / Store (toggle with left controller "menu" if available; fallback: A/X)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";
import { World } from "./world.js";

// OPTIONAL: if you have these modules later, menu buttons can call them.
// For now they just log + move spawn zones.
let renderer, scene, camera, rig;
let clock;

let controller0, controller1;
let grip0, grip1;
let ray0, ray1;

let teleportMarker = null;
let teleportHit = null;
let raycaster = null;

let lastTurnTime = 0;
const snapCooldown = 0.28;
const snapAngle = THREE.MathUtils.degToRad(45);

const MOVE_SPEED = 2.05;

// MENU
let menuGroup = null;
let menuVisible = false;

// ---------- helpers ----------
function $(id) { return document.getElementById(id); }
function logLine(s) {
  const el = $("log");
  if (!el) return;
  if (el.textContent.includes("Waiting for main.js")) el.textContent = "";
  el.textContent += (el.textContent ? "\n" : "") + s;
}
function ensureAppContainer() {
  return document.getElementById("app") || document.body;
}

function buildRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  ensureAppContainer().appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 2, 70);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // brighter lobby lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.45));

  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(4, 10, 3);
  scene.add(dir);

  const fill1 = new THREE.PointLight(0x66aaff, 0.65, 40);
  fill1.position.set(-6, 3.2, 4);
  scene.add(fill1);

  const fill2 = new THREE.PointLight(0x00ffaa, 0.48, 34);
  fill2.position.set(6, 2.6, -2);
  scene.add(fill2);

  const up = new THREE.PointLight(0xffffff, 0.35, 26);
  up.position.set(0, 1.4, 0);
  scene.add(up);

  raycaster = new THREE.Raycaster();
}

function makeRayLine() {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial();
  const line = new THREE.Line(geom, mat);
  line.name = "ray";
  line.scale.z = 8;
  line.visible = false;
  return line;
}

function makeTeleportMarker() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.19, 32),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.35,
      roughness: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.visible = false;
  ring.name = "TeleportMarker";
  scene.add(ring);
  return ring;
}

// Create a simple neon menu panel that can be toggled.
function makeMenuPanel() {
  const g = new THREE.Group();
  g.name = "VRMenu";

  // panel
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.9,
      emissive: 0x112233,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.96,
    })
  );
  panel.position.set(0, 0.05, -0.65);

  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.46),
    new THREE.MeshStandardMaterial({
      color: 0x001812,
      roughness: 0.6,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.35,
    })
  );
  border.position.set(0, 0.05, -0.651);

  g.add(border, panel);

  // buttons (simple 3D boxes)
  const btnGeo = new THREE.BoxGeometry(0.18, 0.055, 0.02);

  function btn(label, x, y, onClick) {
    const b = new THREE.Mesh(
      btnGeo,
      new THREE.MeshStandardMaterial({
        color: 0x101421,
        roughness: 0.75,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.22,
      })
    );
    b.position.set(x, y, -0.635);
    b.userData.onClick = onClick;
    b.userData.label = label;

    // tiny label plate (no text rendering lib; just color-coded)
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.175, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x0e1220,
        emissive: 0xff3366,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.88,
      })
    );
    tag.position.set(0, 0, 0.012);
    b.add(tag);

    g.add(b);
    return b;
  }

  const lobbyBtn = btn("Lobby", -0.2, 0.12, () => {
    logLine("🏛 Lobby button pressed");
    // if you have World spawn pads, you can jump to lobby pad:
    const p = World.getSpawn?.("lobby");
    if (p) { rig.position.x = p.x; rig.position.z = p.z; rig.position.y = 0; }
  });

  const pokerBtn = btn("Poker", 0.0, 0.12, () => {
    logLine("🃏 Poker button pressed");
    const p = World.getSpawn?.("poker");
    if (p) { rig.position.x = p.x; rig.position.z = p.z; rig.position.y = 0; }
  });

  const storeBtn = btn("Store", 0.2, 0.12, () => {
    logLine("🛒 Store button pressed");
    const p = World.getSpawn?.("store");
    if (p) { rig.position.x = p.x; rig.position.z = p.z; rig.position.y = 0; }
  });

  // Place menu in front of camera (attached to camera so it stays stable)
  camera.add(g);
  g.visible = false;

  // keep list for ray-interaction
  g.userData.buttons = [lobbyBtn, pokerBtn, storeBtn];
  return g;
}

function toggleMenu() {
  menuVisible = !menuVisible;
  if (menuGroup) menuGroup.visible = menuVisible;
  logLine(menuVisible ? "📋 Menu OPEN" : "📋 Menu CLOSED");
}

// -------- controllers --------
function buildControllers() {
  controller0 = renderer.xr.getController(0);
  controller1 = renderer.xr.getController(1);

  // Parent to rig so they stay with you
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

  controller0.addEventListener("connected", () => { ray0.visible = true; logLine("✅ controller 0 connected"); });
  controller1.addEventListener("connected", () => { ray1.visible = true; logLine("✅ controller 1 connected"); });
  controller0.addEventListener("disconnected", () => { ray0.visible = false; });
  controller1.addEventListener("disconnected", () => { ray1.visible = false; });

  // Teleport triggers
  controller0.addEventListener("selectstart", () => tryTeleport());
  controller1.addEventListener("selectstart", () => tryTeleport());

  // Menu toggle: try "menu" style button via squeezestart fallback
  controller0.addEventListener("squeezestart", () => toggleMenu());
  controller1.addEventListener("squeezestart", () => toggleMenu());
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getXRSession() {
  return renderer?.xr?.getSession?.() || null;
}

function getStick(handedness) {
  const session = getXRSession();
  if (!session) return { x: 0, y: 0 };

  for (const src of session.inputSources) {
    if (src?.handedness !== handedness) continue;
    const gp = src.gamepad;
    if (!gp?.axes || gp.axes.length < 2) continue;

    const ax = gp.axes;
    if (ax.length >= 4) {
      if (handedness === "left") return { x: ax[0] || 0, y: ax[1] || 0 };
      return { x: ax[2] || 0, y: ax[3] || 0 };
    }
    return { x: ax[0] || 0, y: ax[1] || 0 };
  }
  return { x: 0, y: 0 };
}

function applyLocomotion(dt) {
  if (!renderer.xr.isPresenting) return;

  const left = getStick("left");
  const right = getStick("right");

  const dz = 0.16;
  const lx = Math.abs(left.x) > dz ? left.x : 0;
  const ly = Math.abs(left.y) > dz ? left.y : 0;
  const rx = Math.abs(right.x) > dz ? right.x : 0;

  const forward = -ly; // forward correct
  const strafe = lx;   // right is right

  const yaw = rig.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  rig.position.x += (strafe * cos + forward * sin) * MOVE_SPEED * dt;
  rig.position.z += (forward * cos - strafe * sin) * MOVE_SPEED * dt;
  rig.position.y = 0;

  const now = clock.getElapsedTime();
  if (rx > 0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y -= snapAngle;
    lastTurnTime = now;
  } else if (rx < -0.72 && (now - lastTurnTime) > snapCooldown) {
    rig.rotation.y += snapAngle;
    lastTurnTime = now;
  }
}

// ✅ HARD FIX: ray direction is ALWAYS down-ish relative to the floor.
// We do NOT depend on controller rotation (which can point up depending on pose models).
function updateTeleportPointer() {
  teleportHit = null;

  if (!renderer.xr.isPresenting) {
    if (teleportMarker) teleportMarker.visible = false;
    return;
  }

  const targets = World.getTeleportTargets?.() || [];
  if (!targets.length) {
    if (teleportMarker) teleportMarker.visible = false;
    return;
  }

  const source = grip1 || grip0;
  if (!source) return;

  const origin = new THREE.Vector3().setFromMatrixPosition(source.matrixWorld);

  // Forced down-forward direction in WORLD space:
  // forward component (toward -Z in rig space) + strong downward Y
  // Then rotate by rig yaw so it follows player facing direction.
  const rigYaw = rig.rotation.y;
  const dirLocal = new THREE.Vector3(0, -0.85, -0.55).normalize(); // DOWN + FORWARD
  const dir = dirLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), rigYaw).normalize();

  raycaster.set(origin, dir);
  const hits = raycaster.intersectObjects(targets, true);

  if (hits && hits.length) {
    const p = hits[0].point.clone();
    p.y = 0;
    teleportHit = p;

    teleportMarker.visible = true;
    teleportMarker.position.set(p.x, 0.02, p.z);

    // Ray length
    const line = (source === grip1) ? ray1 : ray0;
    if (line) {
      const dist = origin.distanceTo(hits[0].point);
      line.scale.z = Math.max(0.5, Math.min(30, dist));
      // also aim ray visually DOWN (so it never points up)
      line.lookAt(origin.clone().add(dir));
    }
  } else {
    teleportMarker.visible = false;
  }
}

function tryTeleport() {
  if (!teleportHit) return;
  rig.position.x = teleportHit.x;
  rig.position.z = teleportHit.z;
  rig.position.y = 0;
  logLine(`🟢 Teleport -> (${teleportHit.x.toFixed(2)}, ${teleportHit.z.toFixed(2)})`);
}

// Simple menu interaction: if menu is open, clicking teleport trigger on a button activates it.
// We raycast from the SAME forced ray direction for reliability.
function updateMenuInteraction() {
  if (!menuGroup || !menuVisible) return;

  // place menu in front of camera, stable
  menuGroup.position.set(0, 0.0, 0);
  menuGroup.rotation.set(0, 0, 0);

  // highlight buttons if pointed at
  const buttons = menuGroup.userData.buttons || [];
  for (const b of buttons) {
    b.material.emissiveIntensity = 0.22;
  }
}

export async function boot() {
  clock = new THREE.Clock();

  buildRenderer();
  buildScene();
  buildControllers();

  teleportMarker = makeTeleportMarker();
  menuGroup = makeMenuPanel();

  window.addEventListener("resize", onResize);

  logLine("VIP boot running…");
  await World.build(scene, rig);

  rig.position.y = 0;
  logLine("boot() finished");

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    applyLocomotion(dt);
    updateTeleportPointer();
    updateMenuInteraction();

    World.update(dt, camera);

    renderer.render(scene, camera);
  });
}
