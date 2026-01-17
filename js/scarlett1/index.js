// /js/scarlett1/index.js — SCARLETT1 PRIME ENTRY (FULL)
// BUILD: SCARLETT1_INDEX_FULL_v4_3_FOLDED

const BUILD = "SCARLETT1_INDEX_FULL_v4_3_FOLDED";

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
  console.log("[status]", s);
}

// ---------- Imports (pinned, GitHub-safe) ----------
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { buildWorld } from "./world.js";
console.log("[scarlett1] world.js import OK ✅");

// ---------- Core ----------
let renderer, scene, camera, clock;
let player, head;
let world;
let floorMeshes = [];

let teleportEnabled = false;
let snapTurnCooldown = 0;

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
  setStatus("BOOT FAIL ❌\n" + (e?.stack || e?.message || String(e)));
});

async function boot() {
  setStatus(`booting…\nBUILD=${BUILD}`);
  log("boot", BUILD);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera + player rig
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
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

  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  if (ui.vrMount) ui.vrMount.appendChild(vrBtn);

  // UI
  hookUI();

  setStatus(`boot stage: renderer OK ✅\nBUILD=${BUILD}\nloading world…`);

  // World (FOLDED: hard try/catch with on-screen error)
  try {
    console.log("[scarlett1] calling buildWorld()");
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
    console.log("[scarlett1] buildWorld() returned ✅");
  } catch (e) {
    err("WORLD BUILD FAIL", e);
    setStatus("WORLD BUILD FAIL ❌\n" + (e?.stack || e?.message || String(e)));
    // Keep running so you still get HUD + VR button
    world = null;
  }

  // Controllers
  initXRControllers();

  renderer.xr.addEventListener("sessionstart", () => {
    state.inXR = true;
    setStatus(`XR session started ✅\nBUILD=${BUILD}`);
  });
  renderer.xr.addEventListener("sessionend", () => {
    state.inXR = false;
    setStatus(`XR session ended.\nBUILD=${BUILD}`);
  });

  window.addEventListener("resize", onResize);

  renderer.setAnimationLoop(tick);

  // Final ready status (even if world failed, you’ll see why above)
  if (world) {
    setStatus(
      `ready ✅\nBUILD=${BUILD}\nTeleport: ${teleportEnabled ? "ON" : "OFF"}\nLeft Y: menu • Right stick move • Left stick snap`
    );
  }
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
  player.position.set(0, 1.6, 10);
  player.rotation.set(0, Math.PI, 0);
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

  controllers.leftRay = makeRay(true);
  controllers.rightRay = makeRay(false);
  controllers.left.add(controllers.leftRay);
  controllers.right.add(controllers.rightRay);

  controllers.teleportMarker = makeTeleportMarker();
  scene.add(controllers.teleportMarker);

  controllers.left.addEventListener("connected", (e) => onControllerConnected("left", e));
  controllers.right.addEventListener("connected", (e) => onControllerConnected("right", e));
  controllers.left.addEventListener("disconnected", () => (controllers.leftGamepad = null));
  controllers.right.addEventListener("disconnected", () => (controllers.rightGamepad = null));

  controllers.left.addEventListener("squeezestart", () => onSqueezeStart());
  controllers.right.addEventListener("squeezestart", () => onSqueezeStart());
  controllers.left.addEventListener("squeezeend", () => onSqueezeEnd());
  controllers.right.addEventListener("squeezeend", () => onSqueezeEnd());
}

function onControllerConnected(hand, e) {
  const gp = e?.data?.gamepad || null;
  if (hand === "left") controllers.leftGamepad = gp;
  if (hand === "right") controllers.rightGamepad = gp;
  log(hand, "connected", { hasGamepad: !!gp, id: gp?.id });

  setStatus(
    `controller ${hand} connected ✅\n` +
    `Teleport: ${teleportEnabled ? "ON" : "OFF"}\n` +
    `Left Y: menu • Right stick move • Left stick snap`
  );
}

function makeRay(isLeft) {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const m = new THREE.LineBasicMaterial({ transparent: true, opacity: isLeft ? 0.9 : 0.35 });
  const line = new THREE.Line(g, m);
  line.scale.z = 10;
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

let teleportAiming = false;

function onSqueezeStart() {
  if (!teleportEnabled) return;
  teleportAiming = true;
}

function onSqueezeEnd() {
  if (!teleportEnabled) return;
  teleportAiming = false;
  if (controllers.teleportTarget) {
    const y = player.position.y;
    player.position.set(controllers.teleportTarget.x, y, controllers.teleportTarget.z);
    setStatus(`teleport ✅\n${controllers.teleportTarget.x.toFixed(2)}, ${controllers.teleportTarget.z.toFixed(2)}`);
  }
  controllers.teleportTarget = null;
  controllers.teleportMarker.visible = false;
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

  snapTurnCooldown = Math.max(0, snapTurnCooldown - dt);

  pollGamepads(dt);

  if (teleportEnabled && teleportAiming) updateTeleportAim();
  else if (controllers.teleportMarker) controllers.teleportMarker.visible = false;

  if (world?.update) world.update(dt);

  renderer.render(scene, camera);
}

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

function pollGamepads(dt) {
  const l = controllers.leftGamepad;
  const r = controllers.rightGamepad;

  // Left Y toggle (best effort)
  if (l?.buttons?.length) {
    handleEdgeButton(l, 3, () => toggleDiag()); // likely Y
    handleEdgeButton(l, 4, () => toggleDiag()); // fallback
  }

  // Right stick move
  if (r?.axes?.length >= 2) {
    const x = r.axes[2] ?? r.axes[0] ?? 0;
    const y = r.axes[3] ?? r.axes[1] ?? 0;

    const dz = 0.18;
    const ax = Math.abs(x) > dz ? x : 0;
    const ay = Math.abs(y) > dz ? y : 0;

    if (ax || ay) {
      camera.getWorldDirection(tmpDir);
      tmpDir.y = 0;
      tmpDir.normalize();

      tmpVec.copy(tmpDir).cross(new THREE.Vector3(0, 1, 0)).normalize();

      const speed = 2.0;
      const move = new THREE.Vector3();
      move.addScaledVector(tmpDir, -ay * speed * dt);
      move.addScaledVector(tmpVec, ax * speed * dt);

      player.position.add(move);
    }
  }

  // Left stick snap turn 45 degrees
  if (l?.axes?.length >= 2) {
    const lx = l.axes[2] ?? l.axes[0] ?? 0;
    const dz = 0.35;
    if (snapTurnCooldown === 0 && Math.abs(lx) > dz) {
      const dir = lx > 0 ? -1 : 1;
      player.rotation.y += dir * (Math.PI / 4);
      snapTurnCooldown = 0.28;
    }
  }
}

function updateTeleportAim() {
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
