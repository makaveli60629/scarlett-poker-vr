// /js/main.js — ScarlettVR Poker (GitHub Pages safe)
// Requires: /js/world.js and a local three module at /js/three.module.js
// Optional: if you already have /js/teleport.js etc, you can wire it into the hooks.

import * as THREE from "./three.module.js";
import { World } from "./world.js";

/* -----------------------------
   Small, CDN-free WebXR button
-------------------------------- */
function makeVRButton(renderer, { onEnter, onExit } = {}) {
  const btn = document.createElement("button");
  btn.id = "enter-vr";
  btn.style.cssText = `
    position:fixed; right:16px; bottom:16px; z-index:9999;
    padding:12px 14px; border-radius:14px; border:1px solid rgba(255,255,255,.18);
    background:rgba(10,12,18,.72); color:#e8ecff; font:600 14px system-ui;
    box-shadow:0 10px 30px rgba(0,0,0,.35); backdrop-filter: blur(8px);
  `;
  btn.textContent = "ENTER VR";
  btn.disabled = true;
  btn.style.opacity = "0.6";

  async function init() {
    if (!("xr" in navigator)) {
      btn.textContent = "WEBXR NOT FOUND";
      return;
    }
    try {
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok) {
        btn.textContent = "VR NOT SUPPORTED";
        return;
      }
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.textContent = "ENTER VR";
    } catch (e) {
      btn.textContent = "VR CHECK FAILED";
      console.warn(e);
    }
  }

  btn.onclick = async () => {
    if (!renderer.xr.enabled) renderer.xr.enabled = true;

    if (renderer.xr.isPresenting) {
      const s = renderer.xr.getSession();
      if (s) await s.end();
      return;
    }

    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
        requiredFeatures: ["local-floor"]
      });
      renderer.xr.setSession(session);
      btn.textContent = "EXIT VR";

      session.addEventListener("end", () => {
        btn.textContent = "ENTER VR";
        onExit && onExit();
      });

      onEnter && onEnter();
    } catch (e) {
      console.error("requestSession failed:", e);
    }
  };

  init();
  document.body.appendChild(btn);
  return btn;
}

/* -----------------------------
   App boot
-------------------------------- */
const log = (...a) => console.log("[main]", ...a);

const canvas = document.createElement("canvas");
canvas.style.cssText = "position:fixed; inset:0; width:100%; height:100%;";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.background = "#05060a";
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
renderer.xr.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05060a, 12, 85);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

// Player rig (camera sits inside this)
const player = new THREE.Group();
player.name = "playerRig";
player.position.set(0, 1.7, 6); // lobby spawn (standing)
player.add(camera);
scene.add(player);

/* -----------------------------
   Controllers (Quest)
-------------------------------- */
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  leftGrip: renderer.xr.getControllerGrip(0),
  rightGrip: renderer.xr.getControllerGrip(1),
};
scene.add(controllers.left, controllers.right, controllers.leftGrip, controllers.rightGrip);

// Track input
const input = {
  axesL: [0, 0],
  axesR: [0, 0],
  buttonsL: [],
  buttonsR: [],
  snapCooldown: 0,
};

function pollGamepads() {
  const session = renderer.xr.getSession();
  if (!session) return;
  const sources = session.inputSources;
  // Map: first gamepad -> left, second -> right (usually true on Quest)
  let gpL = null, gpR = null;
  for (const src of sources) {
    if (!src.gamepad) continue;
    if (!gpL) gpL = src.gamepad;
    else if (!gpR) gpR = src.gamepad;
  }
  if (gpL) {
    input.axesL[0] = gpL.axes?.[2] ?? gpL.axes?.[0] ?? 0;
    input.axesL[1] = gpL.axes?.[3] ?? gpL.axes?.[1] ?? 0;
    input.buttonsL = gpL.buttons || [];
  }
  if (gpR) {
    input.axesR[0] = gpR.axes?.[2] ?? gpR.axes?.[0] ?? 0;
    input.axesR[1] = gpR.axes?.[3] ?? gpR.axes?.[1] ?? 0;
    input.buttonsR = gpR.buttons || [];
  }
}

/* -----------------------------
   Build the world
-------------------------------- */
const world = World.init({
  THREE,
  scene,
  renderer,
  camera,
  player,
  controllers,
  log: (...a) => console.log("[world]", ...a),
});

/* -----------------------------
   Movement & seating rules
-------------------------------- */
let mode = "lobby"; // "lobby" | "seated" | "spectate"

function setMode(next) {
  mode = next;
  world.setMode(next);

  // Standing in lobby/spectate; seated at table
  if (next === "seated") {
    // keep camera height fixed while seated
    camera.position.y = 1.35;
  } else {
    camera.position.y = 0; // in VR, HMD supplies height; in desktop, we keep rig height
  }
}

setMode("lobby");

// WASD (desktop fallback)
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

function getMoveVector(dt) {
  let x = 0, z = 0;

  // VR sticks (left)
  x += input.axesL[0] || 0;
  z += input.axesL[1] || 0;

  // Desktop WASD
  if (keys.has("KeyA")) x -= 1;
  if (keys.has("KeyD")) x += 1;
  if (keys.has("KeyW")) z -= 1;
  if (keys.has("KeyS")) z += 1;

  // deadzone
  const dz = 0.12;
  if (Math.abs(x) < dz) x = 0;
  if (Math.abs(z) < dz) z = 0;

  // speed
  const speed = mode === "lobby" ? 2.4 : (mode === "spectate" ? 2.8 : 0.0);
  return { x: x * speed * dt, z: z * speed * dt };
}

function applyMove(dt) {
  if (mode === "seated") return;

  const mv = getMoveVector(dt);
  if (!mv.x && !mv.z) return;

  // Move relative to camera yaw
  const yaw = world.getPlayerYaw();
  const cos = Math.cos(yaw), sin = Math.sin(yaw);

  const dx = mv.x * cos - mv.z * sin;
  const dz = mv.x * sin + mv.z * cos;

  const nextPos = player.position.clone();
  nextPos.x += dx;
  nextPos.z += dz;

  // Collision against world colliders
  const resolved = world.resolvePlayerCollision(player.position, nextPos);
  player.position.copy(resolved);
}

function applySnapTurn(dt) {
  // right stick X
  input.snapCooldown = Math.max(0, input.snapCooldown - dt);
  const sx = input.axesR[0] || 0;

  if (input.snapCooldown > 0) return;

  const thresh = 0.72;
  if (sx > thresh) {
    world.addPlayerYaw(-Math.PI / 6); // 30°
    input.snapCooldown = 0.22;
  } else if (sx < -thresh) {
    world.addPlayerYaw(+Math.PI / 6);
    input.snapCooldown = 0.22;
  }
}

/* -----------------------------
   Auto-seat + spectate
-------------------------------- */
function updateZones() {
  const z = world.getZoneAt(player.position);

  if (z === "table" && mode !== "seated") {
    // Auto-seat into nearest seat
    const seat = world.getNearestSeat(player.position);
    if (seat) {
      world.sitPlayerAtSeat(seat.index);
      setMode("seated");
    }
  }

  if (z === "lobby" && mode === "seated") {
    // If you leave table zone, stand back up
    world.standPlayerInLobby();
    setMode("lobby");
  }

  if (z === "spectate" && mode !== "spectate") {
    setMode("spectate");
  } else if (z !== "spectate" && mode === "spectate") {
    setMode("lobby");
  }
}

// Desktop shortcut keys
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyP") {
    // Toggle spectate (desktop)
    if (mode === "spectate") setMode("lobby");
    else {
      world.movePlayerToSpectate();
      setMode("spectate");
    }
  }
  if (e.code === "Escape" && mode === "seated") {
    world.standPlayerInLobby();
    setMode("lobby");
  }
});

/* -----------------------------
   Resize
-------------------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* -----------------------------
   VR Button
-------------------------------- */
makeVRButton(renderer, {
  onEnter: () => {
    log("VR session start ✅");
    // In VR, camera local y comes from headset; keep rig y for floor.
    // We keep player.position.y as 0 in VR to let local-floor work.
    // World uses local-floor; playerRig y stays at 0 in VR.
    if (renderer.xr.isPresenting) player.position.y = 0;
  },
  onExit: () => {
    log("VR session end ✅");
    // restore desktop standing height
    player.position.y = 1.7;
  }
});

/* -----------------------------
   Render loop
-------------------------------- */
let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  pollGamepads();
  applySnapTurn(dt);
  applyMove(dt);

  world.update(dt);
  updateZones();

  renderer.render(scene, camera);
});

log("boot ✅");
