// /js/main.js — Scarlett VR Poker — Update 9.0 (PATCH B)
// Fixes: correct stick mapping (Quest), forward/back invert, snap turn from right stick,
// face the TABLE on spawn, teleport beam + ring always visible while aiming.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

const hubLog = (m) => { try { window.__hubLog?.(String(m)); } catch {} };
const log = (m) => { console.log("[ScarlettVR]", m); hubLog("[ScarlettVR] " + m); };

let scene, camera, renderer, clock;
let playerRig;
let controller1;

let teleportMarker, teleportBeam;
let pads = [];
let spawnPads = [];
let worldTick = null;

let tableFocus = new THREE.Vector3(0, 0, 0);

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();

const state = {
  moveSpeed: 2.35,
  snapTurnDeg: 45,
  snapCooldown: 0.22,
  lastSnapTime: 0,

  teleportActive: false,
  teleportValid: false,
  teleportPadHit: null,

  roomClamp: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },

  // Controller mapping calibration (per-inputSource)
  // We will decide which axes are left-stick and right-stick once and then keep it.
  mapping: new Map(), // key: inputSource, value: { lx, ly, rx }
};

boot().catch((e) => {
  log("❌ BOOT FAILED: " + (e?.message || e));
  log(e?.stack || "");
});

async function boot() {
  log("main.js booting (Update 9.0 Patch B)");

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070707);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 240);

  playerRig = new THREE.Group();
  camera.position.set(0, 1.6, 0);
  playerRig.add(camera);
  scene.add(playerRig);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const btn = VRButton.createButton(renderer);
  btn.style.position = "fixed";
  btn.style.right = "14px";
  btn.style.bottom = "14px";
  btn.style.zIndex = "99999";
  document.body.appendChild(btn);

  addLights();

  const mod = await import("./world.js");
  const world = await mod.initWorld({ THREE, scene, renderer, hubLog: log });

  pads = world.teleportPads || [];
  spawnPads = world.spawnPads || [];
  worldTick = world.tick || null;

  if (world.roomClamp) state.roomClamp = world.roomClamp;
  if (world.tableFocus) tableFocus.copy(world.tableFocus);

  // Spawn on pad 0 and face the TABLE explicitly
  spawnOnPadFacing(0, tableFocus);

  initControllers();

  teleportMarker = makeTeleportMarker(THREE);
  teleportBeam = makeTeleportBeam(THREE);
  scene.add(teleportMarker);
  scene.add(teleportBeam);

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("✅ Patch B running");
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.35));

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(6, 10, 3);
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 0.8, 120);
  fill.position.set(-6, 4.2, 10);
  scene.add(fill);

  for (let i = 0; i < 6; i++) {
    const p = new THREE.PointLight(0xffffff, 0.35, 55);
    p.position.set(-12 + i * 4.8, 3.1, 2);
    scene.add(p);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
}

function spawnOnPadFacing(index, lookAtPoint) {
  const p = spawnPads[index] || spawnPads[0] || new THREE.Vector3(0, 0, 18);
  playerRig.position.set(p.x, 0, p.z);

  // Face toward tableFocus
  const dx = (lookAtPoint.x - p.x);
  const dz = (lookAtPoint.z - p.z);
  playerRig.rotation.set(0, Math.atan2(dx, dz), 0);

  // If user says it's still reversed, we can flip by PI:
  // playerRig.rotation.y += Math.PI;

  log(`Spawned at x=${p.x.toFixed(2)} z=${p.z.toFixed(2)} facing table`);
}

function initControllers() {
  controller1 = renderer.xr.getController(0);
  scene.add(controller1);

  controller1.addEventListener("selectstart", () => (state.teleportActive = true));
  controller1.addEventListener("selectend", () => {
    state.teleportActive = false;
    if (state.teleportValid && state.teleportPadHit) {
      const p = state.teleportPadHit.position;
      playerRig.position.x = p.x;
      playerRig.position.z = p.z;
    }
  });

  log("Controllers ready");
}

function getMappingForSource(source) {
  // We calibrate once. Assumptions for Quest Touch:
  // - Many browsers expose axes as [0,1] for one stick and [2,3] for the other.
  // - Which is which can vary per input source.
  //
  // We detect which pair changes more when user moves (first time only),
  // but to avoid needing user input, we use a deterministic preference order:
  // Prefer left stick on (0,1) and right on (2,3); if right stick doesn’t exist, fallback.
  //
  // Then we fix sign so forward is forward.

  let m = state.mapping.get(source);
  if (m) return m;

  const axes = source.gamepad?.axes || [];
  const has01 = axes.length >= 2;
  const has23 = axes.length >= 4;

  // Default preference:
  // left: (0,1), right: (2,3) if present
  let lx = 0, ly = 1, rx = 2;

  if (!has01 && has23) {
    lx = 2; ly = 3; rx = 0;
  } else if (has01 && !has23) {
    lx = 0; ly = 1; rx = 0; // no right stick
  } else if (has01 && has23) {
    // Quest often: left stick = 2/3, right stick = 0/1 on some profiles.
    // We will decide by checking which pair is "straighter" at rest:
    // At rest all near 0, so we can’t. Instead we use inputSource.handedness:
    // - left controller: use (2,3) as movement
    // - right controller: use (0,1) as movement
    // And snap turn reads from the OTHER stick horizontal if available.
    if (source.handedness === "left") {
      lx = 2; ly = 3; rx = 0; // snap from 0
    } else if (source.handedness === "right") {
      lx = 0; ly = 1; rx = 2; // snap from 2
    } else {
      lx = 2; ly = 3; rx = 0;
    }
  }

  m = { lx, ly, rx, invertY: false };
  state.mapping.set(source, m);
  log(`Mapped ${source.handedness || "unknown"} controller: lx=${lx}, ly=${ly}, rx=${rx}`);
  return m;
}

function applyVRLocomotion(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const axes = source.gamepad.axes || [];
    const map = getMappingForSource(source);

    const dead = 0.15;

    const lxRaw = axes[map.lx] ?? 0;
    const lyRaw = axes[map.ly] ?? 0;

    // Forward on Quest typically returns -1 when pushed forward.
    // We compute forward = -lyRaw. If the user reports reversed, we flip.
    let forward = -lyRaw;
    if (map.invertY) forward = -forward;

    let strafe = lxRaw;

    if (Math.abs(forward) < dead) forward = 0;
    if (Math.abs(strafe) < dead) strafe = 0;

    // Apply movement only from LEFT controller (important!)
    if (source.handedness === "left") {
      if (forward !== 0 || strafe !== 0) {
        const yaw = playerRig.rotation.y;
        const dx = (Math.sin(yaw)*forward + Math.cos(yaw)*strafe) * state.moveSpeed * dt;
        const dz = (Math.cos(yaw)*forward - Math.sin(yaw)*strafe) * state.moveSpeed * dt;
        playerRig.position.x += dx;
        playerRig.position.z += dz;
      }
    }

    // Snap turn only from RIGHT controller (important!)
    if (source.handedness === "right") {
      let rx = axes[map.rx] ?? 0;
      if (Math.abs(rx) < dead) rx = 0;

      const now = performance.now()/1000;
      if (Math.abs(rx) > 0.65 && (now - state.lastSnapTime) > state.snapCooldown) {
        const dir = rx > 0 ? -1 : 1;
        playerRig.rotation.y += THREE.MathUtils.degToRad(state.snapTurnDeg) * dir;
        state.lastSnapTime = now;
      }
    }
  }

  // Clamp inside room bounds
  const c = state.roomClamp;
  playerRig.position.x = Math.min(c.maxX, Math.max(c.minX, playerRig.position.x));
  playerRig.position.z = Math.min(c.maxZ, Math.max(c.minZ, playerRig.position.z));
}

function updateTeleportVisuals() {
  state.teleportValid = false;
  state.teleportPadHit = null;

  if (!renderer.xr.isPresenting || !state.teleportActive || !pads.length) {
    teleportMarker.visible = false;
    teleportBeam.visible = false;
    return;
  }

  // Ray from controller forward
  tmpMat.identity().extractRotation(controller1.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
  raycaster.ray.direction.set(0,0,-1).applyMatrix4(tmpMat);

  const hits = raycaster.intersectObjects(pads, false);

  let endPoint;
  if (hits.length) {
    const hitPad = hits[0].object;
    state.teleportValid = true;
    state.teleportPadHit = hitPad;

    teleportMarker.visible = true;
    teleportMarker.position.set(hitPad.position.x, 0.04, hitPad.position.z);

    endPoint = teleportMarker.position.clone().setY(0.15);
  } else {
    teleportMarker.visible = false;
    endPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(10));
  }

  // Beam line ALWAYS visible while aiming
  teleportBeam.visible = true;
  const a = raycaster.ray.origin.clone();
  const b = endPoint;

  const pos = teleportBeam.geometry.attributes.position;
  pos.setXYZ(0, a.x, a.y, a.z);
  pos.setXYZ(1, b.x, b.y, b.z);
  pos.needsUpdate = true;
}

function makeTeleportMarker(THREE) {
  const g = new THREE.RingGeometry(0.18, 0.28, 32);
  const m = new THREE.MeshBasicMaterial({ color: 0x33ff66, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  return ring;
}

function makeTeleportBeam(THREE) {
  const g = new THREE.BufferGeometry();
  const vertices = new Float32Array(6);
  g.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  const m = new THREE.LineBasicMaterial({ color: 0x33ff66 });
  const line = new THREE.Line(g, m);
  line.visible = false;
  return line;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (renderer.xr.isPresenting) {
    applyVRLocomotion(dt);
    updateTeleportVisuals();
  }

  try { worldTick?.(dt); } catch {}
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
    }
