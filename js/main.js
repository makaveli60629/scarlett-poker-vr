// /js/main.js — Scarlett Poker VR — Core Stable Build (GitHub Pages Safe)
// - Always shows VRButton
// - Builds World
// - Spawns on Lobby pad
// - VRRig (controllers + laser + ring + teleport)
// - Android DEV joysticks (MOVE / TURN)
// - Hub loader: safely loads your other JS modules without breaking the build

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { createVRRig } from "./vrcontroller.js";
import { createDevTouch } from "./dev_touch.js";
import { createHub, hubOK, hubWarn, hubFail } from "./hub.js";
import { loadOptionalModules } from "./hub_loader.js";

const APP = {
  version: "CORE_STABLE_ALL_IN_ONE_v1",
  HEIGHT_LOCK_M: 1.80,
  BRIGHTNESS_BOOST: true,
  SWAP_MOVE_X: false,  // if left stick L/R feels reversed, flip this live with X
};

let renderer, scene, camera;
let playerGroup;      // main player root
let worldData;
let rig;              // VR rig system
let devTouch;         // Android dev movement
let headlamp;

boot().catch((e) => {
  console.error(e);
  hubFail("Fatal boot error: " + (e?.message || e));
});

async function boot() {
  createHub(document.getElementById("hud"));

  hubOK(`Scarlett Poker VR — booting...\n${APP.version}`);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR Button
  document.body.appendChild(VRButton.createButton(renderer));
  hubOK("VRButton added");

  // Scene + Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, APP.HEIGHT_LOCK_M, 8);

  // Player root
  playerGroup = new THREE.Group();
  playerGroup.name = "PlayerGroup";
  playerGroup.add(camera);
  scene.add(playerGroup);

  // Baseline lights (always on)
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.85);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(14, 24, 10);
  scene.add(sun);

  // Headlamp on camera (fix black void)
  headlamp = new THREE.SpotLight(0xffffff, APP.BRIGHTNESS_BOOST ? 2.0 : 1.2, 30, Math.PI / 5, 0.25, 1);
  headlamp.position.set(0, 0.1, 0.1);
  headlamp.target.position.set(0, 0, -1);
  camera.add(headlamp);
  camera.add(headlamp.target);
  hubOK("Baseline lights + headlamp enabled");

  // World
  worldData = World.build(scene, playerGroup);
  hubOK("world.js built");

  // Spawn on Lobby pad
  safeSpawnToPad("lobby");
  hubOK(`Spawn set to pad (${worldData.spawn.x.toFixed(2)}, ${worldData.spawn.z.toFixed(2)})`);

  // VR Rig
  rig = createVRRig(renderer, scene, camera, {
    heightLockM: APP.HEIGHT_LOCK_M,
    getWorld: () => worldData,
    swapMoveX: () => APP.SWAP_MOVE_X,
  });
  hubOK("VRRig: controllers (grip-based) ready");
  hubOK(`VRRig: heightlock ON @ ${APP.HEIGHT_LOCK_M.toFixed(2)}m`);
  hubOK("VRRig created");

  // Android DEV touch controls
  devTouch = createDevTouch({
    rootEl: document.getElementById("devControls"),
    moveEl: document.getElementById("joyMove"),
    moveStickEl: document.getElementById("joyMoveStick"),
    turnEl: document.getElementById("joyTurn"),
    turnStickEl: document.getElementById("joyTurnStick"),
  });
  if (devTouch.enabled) hubOK("DEV MODE ON (buttons + movement)");

  // Load your optional modules safely (won’t break if they error)
  await loadOptionalModules({
    hubOK, hubWarn, hubFail,
    context: {
      THREE,
      renderer,
      scene,
      camera,
      playerGroup,
      worldData,
      rig,
    }
  });

  hubOK("Boot complete");

  // Resize
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Keyboard dev shortcuts
  addEventListener("keydown", (e) => {
    if (e.key === "b" || e.key === "B") toggleBrightness();
    if (e.key === "x" || e.key === "X") {
      APP.SWAP_MOVE_X = !APP.SWAP_MOVE_X;
      hubWarn(`Swap Move X: ${APP.SWAP_MOVE_X ? "ON" : "OFF"}`);
    }
    if (e.key === "h" || e.key === "H") adjustHeight(+0.05);
    if (e.key === "j" || e.key === "J") adjustHeight(-0.05);
  });

  // Main loop
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // Update rig (controllers, laser, teleport, movement in XR)
    rig.update(dt);

    // If not in XR, allow desktop keys + Android dev joystick movement
    if (!renderer.xr.isPresenting) {
      applyDesktopMovement(dt);
      applyAndroidMovement(dt);
    }

    renderer.render(scene, camera);
  });
}

function safeSpawnToPad(id) {
  const pad = worldData?.padById?.[id];
  const p = pad?.position || worldData?.spawn || new THREE.Vector3(0, 0, 11.5);

  // Keep player on floor and outside table
  playerGroup.position.set(p.x, 0, p.z);
}

const keys = { w:false,a:false,s:false,d:false,q:false,e:false };
addEventListener("keydown", (e) => {
  if (e.key === "w") keys.w = true;
  if (e.key === "a") keys.a = true;
  if (e.key === "s") keys.s = true;
  if (e.key === "d") keys.d = true;
  if (e.key === "q") keys.q = true;
  if (e.key === "e") keys.e = true;
});
addEventListener("keyup", (e) => {
  if (e.key === "w") keys.w = false;
  if (e.key === "a") keys.a = false;
  if (e.key === "s") keys.s = false;
  if (e.key === "d") keys.d = false;
  if (e.key === "q") keys.q = false;
  if (e.key === "e") keys.e = false;
});

function applyDesktopMovement(dt) {
  const speed = 2.2;
  const turnSpeed = 1.8;

  if (keys.q) playerGroup.rotation.y += turnSpeed * dt;
  if (keys.e) playerGroup.rotation.y -= turnSpeed * dt;

  const dir = new THREE.Vector3();
  if (keys.w) dir.z -= 1;
  if (keys.s) dir.z += 1;
  if (keys.a) dir.x -= 1;
  if (keys.d) dir.x += 1;
  if (dir.lengthSq() < 0.0001) return;

  dir.normalize();
  dir.applyAxisAngle(new THREE.Vector3(0,1,0), playerGroup.rotation.y);
  attemptMove(dir.multiplyScalar(speed * dt));
}

function applyAndroidMovement(dt) {
  if (!devTouch?.enabled) return;
  const v = devTouch.getMove();   // x,z
  const t = devTouch.getTurn();   // x
  const speed = 2.0;
  const snap = 1.6;

  if (Math.abs(t) > 0.1) playerGroup.rotation.y -= t * snap * dt;

  const move = new THREE.Vector3(v.x, 0, v.y);
  if (move.lengthSq() < 0.0005) return;

  move.normalize().multiplyScalar(speed * dt);
  move.applyAxisAngle(new THREE.Vector3(0,1,0), playerGroup.rotation.y);
  attemptMove(move);
}

function attemptMove(delta) {
  // Bounds clamp (from world)
  const b = worldData?.bounds;
  if (!b) {
    playerGroup.position.add(delta);
    return;
  }

  const next = playerGroup.position.clone().add(delta);

  // Keep inside room bounds
  next.x = THREE.MathUtils.clamp(next.x, b.min.x, b.max.x);
  next.z = THREE.MathUtils.clamp(next.z, b.min.z, b.max.z);

  // Very simple “don’t go through table collider area” (keep-out box)
  // Your World already includes table collider; this is an extra safety fallback.
  const keepOut = new THREE.Box3(
    new THREE.Vector3(-3.2, 0, -3.2),
    new THREE.Vector3( 3.2, 3,  3.2)
  );
  if (keepOut.containsPoint(next)) return;

  playerGroup.position.copy(next);
}

function toggleBrightness() {
  APP.BRIGHTNESS_BOOST = !APP.BRIGHTNESS_BOOST;
  headlamp.intensity = APP.BRIGHTNESS_BOOST ? 2.0 : 1.2;
  renderer.toneMappingExposure = APP.BRIGHTNESS_BOOST ? 1.45 : 1.25;
  hubWarn(`Brightness boost: ${APP.BRIGHTNESS_BOOST ? "ON" : "OFF"}`);
}

function adjustHeight(d) {
  APP.HEIGHT_LOCK_M = THREE.MathUtils.clamp(APP.HEIGHT_LOCK_M + d, 1.4, 2.2);
  rig.setHeightLock(APP.HEIGHT_LOCK_M);
  hubWarn(`Height lock: ${APP.HEIGHT_LOCK_M.toFixed(2)}m`);
}
