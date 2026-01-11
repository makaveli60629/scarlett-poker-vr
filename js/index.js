// /js/index.js — Scarlett VR Poker Runtime (FULL) Update 4.8.4
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

const now = () => new Date().toTimeString().slice(0, 8);

function uiLog(msg) {
  console.log(msg);
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += `${msg}\n`;
  el.scrollTop = el.scrollHeight;
}

function logTag(tag, msg) {
  uiLog(`[${now()}] [${tag}] ${msg}`);
}

function safe(tag, fn) {
  try { return fn(); }
  catch (e) {
    console.error(e);
    logTag(tag, `ERROR ❌ ${e?.message || e}`);
    return null;
  }
}

const BUILD = "4.8.4 (HALLWAYS + spawn safe)";

logTag("index", "runtime start ✅");

// Renderer
const renderer = safe("index", () => {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.setSize(window.innerWidth, window.innerHeight);
  r.xr.enabled = true;
  document.body.appendChild(r.domElement);
  return r;
});

// Scene + camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
camera.position.set(0, 1.6, 6);

// Player rig
const player = new THREE.Group();
player.name = "PlayerRig";
player.position.set(0, 0, 0);
player.add(camera);
scene.add(player);

// Lights (simple + safe)
safe("index", () => {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.9);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(6, 12, 4);
  scene.add(dir);
});

// VR Button
safe("index", () => {
  document.body.appendChild(VRButton.createButton(renderer));
  logTag("index", "VRButton appended ✅");
});

// Controllers (laser-only)
const controllers = [];
safe("index", () => {
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.name = `controller_${i}`;
    player.add(c);
    controllers.push(c);

    // laser line (visual)
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff }));
    line.name = "laser";
    line.scale.z = 10;
    c.add(line);
  }
  logTag("index", "controller rays installed ✅ (laser only)");
});

// Android dual-stick (touch)
const touch = {
  left: { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false },
  right:{ id: null, x0: 0, y0: 0, x: 0, y: 0, active: false }
};

function setupAndroidDualStick() {
  const leftPad = document.getElementById("stickL");
  const rightPad = document.getElementById("stickR");
  if (!leftPad || !rightPad) return;

  const bind = (el, side) => {
    const s = touch[side];
    const rectOf = () => el.getBoundingClientRect();
    const norm = (cx, cy) => {
      const r = rectOf();
      const x = (cx - (r.left + r.width * 0.5)) / (r.width * 0.5);
      const y = (cy - (r.top  + r.height * 0.5)) / (r.height * 0.5);
      s.x = Math.max(-1, Math.min(1, x));
      s.y = Math.max(-1, Math.min(1, y));
    };

    el.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      s.id = t.identifier;
      s.active = true;
      norm(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    el.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === s.id) {
          norm(t.clientX, t.clientY);
          break;
        }
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === s.id) {
          s.id = null;
          s.active = false;
          s.x = 0; s.y = 0;
          break;
        }
      }
      e.preventDefault();
    };

    el.addEventListener("touchend", end, { passive: false });
    el.addEventListener("touchcancel", end, { passive: false });
  };

  bind(leftPad, "left");
  bind(rightPad, "right");
  logTag("android", "dual-stick ready ✅");
}
setupAndroidDualStick();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Build world
logTag("index", "calling world.build() …");

const world = {
  group: new THREE.Group()
};
scene.add(world.group);

safe("world", () => {
  World.build({ THREE, scene, renderer, camera, player, controllers, world, logTag, BUILD });
});

// Movement (Android + VR)
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const euler = new THREE.Euler(0, 0, 0, "YXZ");

let lastT = performance.now();

function getYawFromCamera() {
  // Use camera world quaternion; yaw only
  camera.getWorldQuaternion(tmpQ);
  euler.setFromQuaternion(tmpQ);
  return euler.y;
}

function tick() {
  const t = performance.now();
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;

  // Android move/look
  const moveX = touch.left.x;    // strafe
  const moveZ = -touch.left.y;   // forward
  const lookX = touch.right.x;   // yaw
  const lookY = touch.right.y;   // pitch

  // Apply look to camera when NOT in XR, for phone debugging
  if (!renderer.xr.isPresenting) {
    const yawSpeed = 1.8;
    const pitchSpeed = 1.2;

    const yaw = getYawFromCamera() - lookX * yawSpeed * dt;
    const pitch = THREE.MathUtils.clamp(euler.x - lookY * pitchSpeed * dt, -1.2, 1.2);

    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
  }

  // Apply movement in XZ relative to yaw
  const speed = 3.0;
  const yaw = getYawFromCamera();
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  tmpV.set(0, 0, 0);
  tmpV.addScaledVector(forward, moveZ);
  tmpV.addScaledVector(right, moveX);
  if (tmpV.lengthSq() > 1e-6) tmpV.normalize().multiplyScalar(speed * dt);

  // Keep player on ground plane (y=0), camera at ~1.6
  player.position.add(tmpV);
  player.position.y = 0;

  // Allow world systems update
  safe("world", () => World.update?.({ dt, t: t / 1000 }));

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(tick);

logTag("index", "world start ✅");

// XR support log (matches your screenshot)
safe("VRButton", async () => {
  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    logTag("VRButton", `isSessionSupported(immersive-vr) = ${ok}`);
  }
});
