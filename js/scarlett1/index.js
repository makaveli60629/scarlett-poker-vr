// /js/scarlett1/index.js — SCARLETT1 PRIME ENTRY (FULL)
// BUILD: SCARLETT1_INDEX_FULL_v4_3
// GitHub Pages safe: NO bare specifiers (no "three") — only absolute URLs.

const BUILD = "SCARLETT1_INDEX_FULL_v4_3";

const log = (...a) => console.log("[scarlett1]", ...a);
const warn = (...a) => console.warn("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

const $ = (id) => document.getElementById(id);

const ui = {
  hud: $("hud"),
  status: $("status"),
  vrMount: $("vrButtonMount"),
  btnHideHud: $("btnHideHud"),
  btnTeleport: $("btnTeleport"),
  btnDiag: $("btnDiag"),
  diagPanel: $("diagPanel"),
  btnTestModules: $("btnTestModules"),
  btnResetPlayer: $("btnResetPlayer"),
  btnReload: $("btnReload"),
};

function setStatus(s) {
  if (ui.status) ui.status.textContent = s;
}

// ---------- Imports (pinned) ----------
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { buildWorld } from "./world.js";

// ---------- Core ----------
let renderer, scene, camera, clock;
let player;              // a group that we move
let head;                // camera sits under this
let world;               // world module
let floorMeshes = [];    // teleport intersection targets

// locomotion
let teleportEnabled = false;
let snapTurnCooldown = 0;

// controllers
const controllers = {
  left: null,
  right: null,
  leftGrip: null,
  rightGrip: null,
  leftGamepad: null,
  rightGamepad: null,
  leftRay: null,
  rightRay: null,
  teleportMarker: null,
  teleportTarget: null,
};

const state = {
  inXR: false,
  diagOpen: false,
  hudHidden: false,
};

boot().catch((e) => {
  err("BOOT FAIL", e);
  setStatus("BOOT FAIL ❌\n" + (e?.message || e));
});

async function boot() {
  setStatus(`booting…\nBUILD=${BUILD}`);
  log("boot", BUILD);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera + player rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  player = new THREE.Group();
  head = new THREE.Group();
  head.add(camera);
  player.add(head);
  scene.add(player);

  player.position.set(0, 1.6, 6);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.getElementById("app").appendChild(renderer.domElement);

  clock = new THREE.Clock();

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  if (ui.vrMount) ui.vrMount.appendChild(vrBtn);

  // UI hooks
  hookUI();

  // World
  world = await buildWorld({
    THREE,
    scene,
    player,
    renderer,
    onRegisterFloors: (meshes) => {
      floorMeshes = meshes || [];
    },
    onStatus: (s) => setStatus(s),
    log,
    warn,
    err,
  });

  // Controllers
  initXRControllers();

  // XR session events
  renderer.xr.addEventListener("sessionstart", () => {
    state.inXR = true;
    setStatus(`XR session started ✅\nBUILD=${BUILD}`);
  });
  renderer.xr.addEventListener("sessionend", () => {
    state.inXR = false;
    setStatus(`XR session ended.\nBUILD=${BUILD}`);
  });

  // Resize
  window.addEventListener("resize", onResize);

  // Start loop
  renderer.setAnimationLoop(tick);

  setStatus(`ready ✅\nBUILD=${BUILD}\nTeleport: OFF\nLeft Y: menu • Right stick move • Left stick snap`);
}

function hookUI() {
  ui.btnHideHud?.addEventListener("click", () => {
    state.hudHidden = !state.hudHidden;
    ui.hud.style.display = state.hudHidden ? "none" : "block";
    ui.btnHideHud.textContent = state.hudHidden ? "Show HUD" : "Hide HUD";
  });

  ui.btnTeleport?.addEventListener("click", () => {
    teleportEnabled = !teleportEnabled;
    ui.btnTeleport.textContent = teleportEnabled ? "Teleport: ON" : "Teleport: OFF";
  });

  ui.btnDiag?.addEventListener("click", () => toggleDiag());

  ui.btnTestModules?.addEventListener("click", () => {
    // "Module Test" style button: proves all key subsystems are alive
    const ok = {
      three: !!THREE,
      xr: !!navigator.xr,
      renderer: !!renderer,
      world: !!world,
      floors: floorMeshes.length,
    };
    setStatus(
      `MODULE TEST ✅\n` +
      `three=${ok.three}\n` +
      `navigator.xr=${ok.xr}\n` +
      `renderer=${ok.renderer}\n` +
      `world=${ok.world}\n` +
      `floors=${ok.floors}`
    );
  });

  ui.btnResetPlayer?.addEventListener("click", () => resetPlayer());

  ui.btnReload?.addEventListener("click", () => location.reload());
}

function toggleDiag(force) {
  state.diagOpen = typeof force === "boolean" ? force : !state.diagOpen;
  ui.diagPanel.style.display = state.diagOpen ? "block" : "none";
}

function resetPlayer() {
  player.position.set(0, 1.6, 6);
  player.rotation.set(0, 0, 0);
  setStatus(`player reset ✅\npos=${player.position.x.toFixed(2)},${player.position.y.toFixed(2)},${player.position.z.toFixed(2)}`);
}

// ---------- XR Controllers ----------
function initXRControllers() {
  const controllerModelFactory = new XRControllerModelFactory();

  controllers.left = renderer.xr.getController(0);
  controllers.right = renderer.xr.getController(1);
  scene.add(controllers.left);
  scene.add(controllers.right);

  controllers.leftGrip = renderer.xr.getControllerGrip(0);
  controllers.rightGrip = renderer.xr.getControllerGrip(1);

  controllers.leftGrip.add(controllerModelFactory.createControllerModel(controllers.leftGrip));
  controllers.rightGrip.add(controllerModelFactory.createControllerModel(controllers.rightGrip));

  scene.add(controllers.leftGrip);
  scene.add(controllers.rightGrip);

  // Rays (lasers)
  controllers.leftRay = makeRay(true);
  controllers.rightRay = makeRay(false);
  controllers.left.add(controllers.leftRay);
  controllers.right.add(controllers.rightRay);

  // Teleport marker
  controllers.teleportMarker = makeTeleportMarker();
  scene.add(controllers.teleportMarker);

  // Events
  controllers.left.addEventListener("connected", (e) => onControllerConnected("left", e));
  controllers.right.addEventListener("connected", (e) => onControllerConnected("right", e));
  controllers.left.addEventListener("disconnected", () => (controllers.leftGamepad = null));
  controllers.right.addEventListener("disconnected", () => (controllers.rightGamepad = null));

  // Teleport + interactions
  controllers.left.addEventListener("selectstart", () => onSelectStart("left"));
  controllers.right.addEventListener("selectstart", () => onSelectStart("right"));
  controllers.left.addEventListener("selectend", () => onSelectEnd("left"));
  controllers.right.addEventListener("selectend", () => onSelectEnd("right"));

  controllers.left.addEventListener("squeezestart", () => onSqueezeStart("left"));
  controllers.right.addEventListener("squeezestart", () => onSqueezeStart("right"));
  controllers.left.addEventListener("squeezeend", () => onSqueezeEnd("left"));
  controllers.right.addEventListener("squeezeend", () => onSqueezeEnd("right"));
}

function onControllerConnected(hand, e) {
  const gp = e?.data?.gamepad || null;
  if (hand === "left") controllers.leftGamepad = gp;
  if (hand === "right") controllers.rightGamepad = gp;
  log(hand, "connected", { hasGamepad: !!gp, id: gp?.id });

  // show status hints
  setStatus(
    `controller ${hand} connected ✅\n` +
    `Teleport: ${teleportEnabled ? "ON" : "OFF"}\n` +
    `Left Y: menu • Right stick move • Left stick snap`
  );
}

function onSelectStart(hand) {
  // Select is typically trigger; we keep it open for future UI selection.
}

function onSelectEnd(hand) {
  // future
}

let teleportAiming = false;
function onSqueezeStart(hand) {
  // Grip = teleport aim when enabled
  if (!teleportEnabled) return;
  teleportAiming = true;
}
function onSqueezeEnd(hand) {
  if (!teleportEnabled) return;
  // confirm teleport if we have target
  teleportAiming = false;
  if (controllers.teleportTarget) {
    doTeleport(controllers.teleportTarget);
    controllers.teleportTarget = null;
  }
  controllers.teleportMarker.visible = false;
}

// ---------- Helpers ----------
function makeRay(isLeft) {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const m = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
  const line = new THREE.Line(g, m);
  line.scale.z = 10;
  line.visible = true; // you wanted left laser to exist
  // keep right laser subtle; still visible for debugging
  if (!isLeft) line.material.opacity = 0.35;
  return line;
}

function makeTeleportMarker() {
  const geo = new THREE.RingGeometry(0.15, 0.22, 32);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

function doTeleport(targetPos) {
  // preserve player height
  const y = player.position.y;
  player.position.set(targetPos.x, y, targetPos.z);
  setStatus(`teleport ✅\n${targetPos.x.toFixed(2)}, ${targetPos.z.toFixed(2)}`);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------- Frame loop ----------
const tmpDir = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  // update snap cooldown
  snapTurnCooldown = Math.max(0, snapTurnCooldown - dt);

  // update gamepads
  pollGamepads(dt);

  // teleport aim
  if (teleportEnabled && teleportAiming) {
    updateTeleportAim();
  } else {
    controllers.teleportMarker.visible = false;
  }

  // world update
  if (world?.update) world.update(dt);

  renderer.render(scene, camera);
}

function pollGamepads(dt) {
  // Left Y toggles menu (common mapping: button 3 or 4 varies by device)
  // We'll scan buttons with "pressed" edge detection for robustness.
  const l = controllers.leftGamepad;
  const r = controllers.rightGamepad;

  // handle left menu toggle via Y (best-effort)
  if (l?.buttons?.length) {
    // Many Quest mappings:
    // buttons[3] = Y, buttons[4] = X (varies). We do a small set + fallback scan.
    handleEdgeButton(l, 3, () => toggleDiag()); // attempt Y
    handleEdgeButton(l, 4, () => toggleDiag()); // fallback
  }

  // Smooth move: right stick
  if (r?.axes?.length >= 2) {
    const x = r.axes[2] ?? r.axes[0] ?? 0;
    const y = r.axes[3] ?? r.axes[1] ?? 0;

    // deadzone
    const dz = 0.18;
    const ax = Math.abs(x) > dz ? x : 0;
    const ay = Math.abs(y) > dz ? y : 0;

    if (ax || ay) {
      // move in camera heading (horizontal)
      camera.getWorldDirection(tmpDir);
      tmpDir.y = 0;
      tmpDir.normalize();

      // right vector
      tmpVec.copy(tmpDir).cross(new THREE.Vector3(0, 1, 0)).normalize();

      const speed = 2.0; // m/s
      const move = new THREE.Vector3();
      move.addScaledVector(tmpDir, -ay * speed * dt);
      move.addScaledVector(tmpVec, ax * speed * dt);

      player.position.add(move);
    }
  }

  // Snap turn: left stick X (45 degrees)
  if (l?.axes?.length >= 2) {
    const lx = l.axes[2] ?? l.axes[0] ?? 0;
    const dz = 0.35;
    if (snapTurnCooldown === 0 && Math.abs(lx) > dz) {
      const dir = lx > 0 ? -1 : 1;
      player.rotation.y += dir * (Math.PI / 4); // 45 degrees
      snapTurnCooldown = 0.28;
    }
  }
}

// edge-detect buttons per gamepad instance
const prevPressed = new WeakMap();
function handleEdgeButton(gamepad, index, fn) {
  if (!gamepad?.buttons?.[index]) return;
  let m = prevPressed.get(gamepad);
  if (!m) { m = {}; prevPressed.set(gamepad, m); }
  const was = !!m[index];
  const now = !!gamepad.buttons[index].pressed;
  if (!was && now) fn();
  m[index] = now;
}

function updateTeleportAim() {
  // Aim from whichever controller is gripping (prefer right if available)
  const originObj = controllers.right || controllers.left;
  if (!originObj) return;

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);

  originObj.getWorldPosition(origin);
  dir.applyQuaternion(originObj.getWorldQuaternion(new THREE.Quaternion())).normalize();

  raycaster.set(origin, dir);
  raycaster.far = 20;

  const hits = raycaster.intersectObjects(floorMeshes, true);
  if (hits.length) {
    const p = hits[0].point;
    controllers.teleportTarget = p;
    controllers.teleportMarker.position.copy(p);
    controllers.teleportMarker.visible = true;
  } else {
    controllers.teleportTarget = null;
    controllers.teleportMarker.visible = false;
  }
                                      }
