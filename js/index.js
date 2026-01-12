// /js/index.js — MASTER FIX (NO "three" bare imports anywhere)
// Uses your wrapper: /js/three.js

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";

const BUILD = "MASTER FIX 5.2 (Wrapper Only — No bare imports)";
const log = (...a) => console.log(...a);

log(`[index] runtime start ✅ (${BUILD})`);
log(`[index] THREE.REVISION=${THREE.REVISION ?? "?"}`);

let scene, camera, renderer, player, clock;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);

  player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);
  player.add(camera);
  camera.position.set(0, 1.65, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(10, 18, 8);
  scene.add(sun);

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));
  log("[vr] VRButton appended ✅");

  // world
  log("[world] calling World.build() …");
  World.build({ THREE, scene, log, BUILD });
  log("[world] build complete ✅");

  // spawn in VIP lobby pad
  resetToVIPLobby();

  // reset on XR start
  renderer.xr.addEventListener("sessionstart", () => {
    log("[XR] sessionstart ✅");
    camera.position.set(0, 0, 0);
    resetToVIPLobby();
  });

  renderer.xr.addEventListener("sessionend", () => {
    log("[XR] sessionend ✅");
    camera.position.set(0, 1.65, 0);
  });

  // super-simple movement (Quest + Desktop)
  installMovement();

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    moveTick(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  });

  log("[index] ready ✅");
}

function resetToVIPLobby() {
  const s = World.getSpawn("lobby_vip_A");
  player.position.set(s.x, s.y, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  log("[spawn] VIP lobby ✅", s);
}

let keyX = 0, keyY = 0;
let moveX = 0, moveY = 0;
let turn = 0;

function installMovement() {
  // desktop keys
  const keys = new Set();
  addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === "r") resetToVIPLobby();
    upd();
  });
  addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
    upd();
  });
  function upd() {
    keyX = 0; keyY = 0;
    if (keys.has("a")) keyX -= 1;
    if (keys.has("d")) keyX += 1;
    if (keys.has("w")) keyY += 1;
    if (keys.has("s")) keyY -= 1;
  }

  // XR: read gamepad every frame in moveTick()
  log("[move] installed ✅ (WASD + XR thumbstick)");
}

function moveTick(dt) {
  const presenting = renderer.xr.isPresenting;

  moveX = 0; moveY = 0; turn = 0;

  if (!presenting) {
    moveX = keyX;
    moveY = keyY;
  } else {
    const session = renderer.xr.getSession?.();
    if (session) {
      let best = { mag: 0, mx: 0, my: 0, tx: 0 };
      for (const src of session.inputSources) {
        const gp = src?.gamepad;
        if (!gp || !gp.axes) continue;
        const a = gp.axes;
        const a0 = a[0] ?? 0, a1 = a[1] ?? 0, a2 = a[2] ?? 0, a3 = a[3] ?? 0;
        const m01 = Math.abs(a0) + Math.abs(a1);
        const m23 = Math.abs(a2) + Math.abs(a3);
        const mx = (m23 > m01) ? a2 : a0;
        const my = (m23 > m01) ? a3 : a1;
        const mag = Math.abs(mx) + Math.abs(my);
        const tx = (m23 > m01) ? a0 : a2;
        if (mag > best.mag) best = { mag, mx, my, tx };
      }
      moveX = best.mx;
      moveY = best.my;
      turn = best.tx * 0.85;
    }
  }

  // deadzones
  const dz = 0.12;
  if (Math.abs(moveX) < dz) moveX = 0;
  if (Math.abs(moveY) < dz) moveY = 0;
  if (Math.abs(turn) < 0.18) turn = 0;

  // turn rig
  if (turn) player.rotation.y -= turn * 2.0 * dt;

  // move relative to heading
  if (moveX || moveY) {
    const heading = getHeadingYaw(presenting);
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const v = new THREE.Vector3()
      .addScaledVector(right, moveX)
      .addScaledVector(forward, moveY);

    if (v.lengthSq() > 0.00001) {
      v.normalize().multiplyScalar(2.6 * dt);
      player.position.add(v);
    }
  }
}

function getHeadingYaw(presenting) {
  if (!presenting) return player.rotation.y;
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
                }
