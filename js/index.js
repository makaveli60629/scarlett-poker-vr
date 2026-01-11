// /js/index.js — Scarlett Runtime MASTER (Clean Build)
// ✅ No debug grids, no probe helpers, no pink square, no green ball
// ✅ Keeps controller laser line
// ✅ Android dual-stick locomotion (touch) + desktop WASD
// ✅ VR-ready with VRButton
// ✅ Calls world.build() and world.frame()
import { World } from "./world.js?v=4_8_3_radial_fix";
import * as THREE from "three";
import { VRButton } from "./VRButton.js";

const log = (...a) => console.log(...a);

const STATE = {
  THREE,
  scene: null,
  renderer: null,
  camera: null,
  player: null,
  controllers: [],
  clock: new THREE.Clock(),

  // movement
  move: { x: 0, z: 0, yaw: 0 },
  speed: 2.1,          // meters/sec
  turnSpeed: 2.0,      // rad/sec

  // android sticks
  sticks: { left: null, right: null },
  keys: new Set(),

  // rays
  rayLines: [],

  // config
  NO_DEBUG_VISUALS: true
};

// -----------------------------
// Helpers
// -----------------------------
function makeRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.setSize(window.innerWidth, window.innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace;

  r.xr.enabled = true;
  document.body.appendChild(r.domElement);

  document.body.appendChild(VRButton.createButton(r));
  log("[index] VRButton appended ✅");
  return r;
}

function makeScene() {
  const s = new THREE.Scene();
  // ✅ Fix: no blue void
  s.background = new THREE.Color(0x05060a);
  s.fog = new THREE.Fog(0x05060a, 10, 55);
  return s;
}

function makePlayerRig(camera) {
  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  return player;
}

function makeCamera() {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 200);
  cam.position.set(0, 1.65, 0);
  return cam;
}

// -----------------------------
// Controller Rays (laser only, NO markers)
// -----------------------------
function installControllerRays(renderer, controllers, scene) {
  const makeRayLine = () => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1.2)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.name = "ControllerRayLine";
    return line;
  };

  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.name = `XRController_${i}`;
    scene.add(c);
    controllers[i] = c;

    // Laser line only (no spheres, no quads, no debug markers)
    const line = makeRayLine();
    c.add(line);
    STATE.rayLines[i] = line;
  }

  log("[index] controller rays installed ✅ (laser only)");
}

// -----------------------------
// Desktop WASD + Arrow keys
// -----------------------------
function installKeyboard() {
  window.addEventListener("keydown", (e) => STATE.keys.add(e.code));
  window.addEventListener("keyup", (e) => STATE.keys.delete(e.code));
}

// -----------------------------
// Android dual-stick (touch)
// Left stick: move (x,z)
// Right stick: turn yaw
// -----------------------------
function installAndroidDualStick() {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  const mkStick = (side) => {
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.bottom = "18px";
    root.style.width = "160px";
    root.style.height = "160px";
    root.style.borderRadius = "999px";
    root.style.border = "1px solid rgba(255,255,255,0.18)";
    root.style.background = "rgba(10,12,18,0.25)";
    root.style.backdropFilter = "blur(6px)";
    root.style.touchAction = "none";
    root.style.zIndex = "99999";
    root.style.userSelect = "none";
    root.style.webkitUserSelect = "none";

    if (side === "left") root.style.left = "18px";
    if (side === "right") root.style.right = "18px";

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.transform = "translate(-50%,-50%)";
    nub.style.width = "64px";
    nub.style.height = "64px";
    nub.style.borderRadius = "999px";
    nub.style.background = "rgba(127,231,255,0.22)";
    nub.style.border = "1px solid rgba(127,231,255,0.45)";
    nub.style.boxShadow = "0 0 18px rgba(127,231,255,0.25)";
    root.appendChild(nub);

    document.body.appendChild(root);

    const stick = {
      side,
      root,
      nub,
      active: false,
      id: -1,
      cx: 0,
      cy: 0,
      x: 0,
      y: 0
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    root.addEventListener("pointerdown", (e) => {
      stick.active = true;
      stick.id = e.pointerId;
      const r = root.getBoundingClientRect();
      stick.cx = r.left + r.width / 2;
      stick.cy = r.top + r.height / 2;
      root.setPointerCapture(e.pointerId);
    });

    root.addEventListener("pointermove", (e) => {
      if (!stick.active || e.pointerId !== stick.id) return;
      const dx = e.clientX - stick.cx;
      const dy = e.clientY - stick.cy;
      const max = 52;

      const nx = clamp(dx / max, -1, 1);
      const ny = clamp(dy / max, -1, 1);

      stick.x = nx;
      stick.y = ny;

      nub.style.transform = `translate(${nx * 42 - 50}%, ${ny * 42 - 50}%)`;
    });

    const end = (e) => {
      if (e.pointerId !== stick.id) return;
      stick.active = false;
      stick.id = -1;
      stick.x = 0;
      stick.y = 0;
      nub.style.transform = "translate(-50%,-50%)";
    };

    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);

    return stick;
  };

  STATE.sticks.left = mkStick("left");
  STATE.sticks.right = mkStick("right");
  log("[android] dual-stick ready ✅");
}

// -----------------------------
// Movement update (player rig, not camera)
// -----------------------------
function updateLocomotion(dt) {
  // Touch sticks
  let mx = 0, mz = 0, yaw = 0;

  if (STATE.sticks.left) {
    mx += STATE.sticks.left.x;
    mz += STATE.sticks.left.y;
  }
  if (STATE.sticks.right) {
    yaw += STATE.sticks.right.x; // horizontal turn
  }

  // Keyboard fallback
  if (STATE.keys.has("KeyA") || STATE.keys.has("ArrowLeft"))  mx -= 1;
  if (STATE.keys.has("KeyD") || STATE.keys.has("ArrowRight")) mx += 1;
  if (STATE.keys.has("KeyW") || STATE.keys.has("ArrowUp"))    mz -= 1;
  if (STATE.keys.has("KeyS") || STATE.keys.has("ArrowDown"))  mz += 1;

  // Apply yaw turn
  STATE.player.rotation.y -= yaw * STATE.turnSpeed * dt;

  // Move relative to player yaw
  const speed = STATE.speed * dt;
  const yawAngle = STATE.player.rotation.y;

  const vx = (mx * Math.cos(yawAngle) - mz * Math.sin(yawAngle)) * speed;
  const vz = (mx * Math.sin(yawAngle) + mz * Math.cos(yawAngle)) * speed;

  // Don't drift if tiny inputs
  if (Math.abs(vx) > 0.00001 || Math.abs(vz) > 0.00001) {
    STATE.player.position.x += vx;
    STATE.player.position.z += vz;
  }
}

// -----------------------------
// Boot
// -----------------------------
async function boot() {
  log("[index] runtime start ✅");

  const scene = makeScene();
  const camera = makeCamera();
  const renderer = makeRenderer();

  const player = makePlayerRig(camera);
  scene.add(player);

  STATE.scene = scene;
  STATE.camera = camera;
  STATE.renderer = renderer;
  STATE.player = player;

  installKeyboard();
  installAndroidDualStick();

  // ✅ Controllers + lasers (no debug markers)
  installControllerRays(renderer, STATE.controllers, scene);

  // ✅ Build world
  log("[index] calling world.build() …");
  await World.build({
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers: STATE.controllers,
    log
  });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render loop
  renderer.setAnimationLoop(() => {
    const dt = STATE.clock.getDelta();

    // Move the player rig if not in XR, OR if you want move in XR too (we DO)
    updateLocomotion(dt);

    // World frame
    World.frame({ THREE, scene, renderer, camera, player, controllers: STATE.controllers }, dt);

    renderer.render(scene, camera);
  });

  log("[index] world start ✅");
}

boot().catch((e) => {
  console.error(e);
  alert("Boot error. Check console.");
});
