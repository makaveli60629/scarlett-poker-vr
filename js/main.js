// /js/main.js — Scarlett VR Poker — FULL MAIN (movement/teleport normal + poker + world + Update 4.0 avatar)
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { initWorld, CyberAvatar } from "./world.js";

const log = (m) => { try { console.log(m); } catch {} };

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- Scene + Camera ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);
camera.position.set(0, 1.6, 3.0);

// ---------- World ----------
const world = initWorld({ THREE, scene, log });

// ---------- VRButton (uses your index session init with hand-tracking) ----------
const sessionInit = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor", "bounded-floor"] };
document.body.appendChild(VRButton.createButton(renderer, sessionInit));
log("[main] VRButton appended ✅");

// ---------- Controllers (hidden) ----------
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
controller1.visible = false;
controller2.visible = false;
scene.add(controller1, controller2);

// ---------- Spawn helper (prevents table-stuck) ----------
function placePlayerAtSpawn() {
  const spawn = (world.spawn || new THREE.Vector3(0, 0, 3.0)).clone();
  const camXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);
  const delta = spawn.clone().sub(camXZ);
  world.group.position.sub(delta);
  log("[spawn] placed ✅ " + spawn.toArray().map(n=>n.toFixed(2)).join(","));
}

renderer.xr.addEventListener("sessionstart", () => {
  requestAnimationFrame(() => placePlayerAtSpawn());
});

// ---------- Avatar 4.0 ----------
const avatar4_0 = new CyberAvatar({
  THREE,
  scene,
  camera,
  textureURL: "assets/textures/cyber_suit_atlas.png",
  log
});

window.addEventListener("scarlett-toggle-hands", (e) => {
  avatar4_0.setHandsVisible(!!e.detail);
});

// ---------- Recenter ----------
window.addEventListener("scarlett-recenter", () => {
  world.group.position.set(0, 0, 0);
  world.group.rotation.set(0, 0, 0);
  placePlayerAtSpawn();
  log("[main] recenter ✅");
});

// ---------- Toggles ----------
const state = {
  moveSpeed: 1.55,
  snapAngle: THREE.MathUtils.degToRad(30),
  snapCooldown: 0,
  teleportOk: false,
  teleportHit: new THREE.Vector3(),
  teleportArmed: false,
};

// ---------- Teleport visuals ----------
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.20, 0.30, 48),
  new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

const rayLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
  new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.8 })
);
rayLine.visible = false;
controller1.add(rayLine);

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();

// Teleport confirm
controller1.addEventListener("selectstart", () => {
  if (!window.__SCARLETT_FLAGS?.teleport) return;
  state.teleportArmed = true;
});
controller1.addEventListener("selectend", () => {
  if (!window.__SCARLETT_FLAGS?.teleport) return;
  if (state.teleportArmed && state.teleportOk) {
    const hit = state.teleportHit.clone();
    const camXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const delta = hit.clone().sub(camXZ);
    world.group.position.sub(delta);
    log("[teleport] ✅ " + hit.toArray().map(n=>n.toFixed(2)).join(","));
  }
  state.teleportArmed = false;
});

// ---------- Mobile touch controls ----------
const touch = { f:0,b:0,l:0,r:0,turnL:0,turnR:0 };
window.addEventListener("scarlett-touch", (e) => {
  const d = e.detail || {};
  touch.f = d.f || 0;
  touch.b = d.b || 0;
  touch.l = d.l || 0;
  touch.r = d.r || 0;
  touch.turnL = d.turnL || 0;
  touch.turnR = d.turnR || 0;
});

// ---------- Poker simulation (simple watchable loop) ----------
const sim = {
  timer: 0,
  phase: "idle",
  deck: [],
  dealIndex: 0,
  handCount: 0,
  winnerSeat: 0,
};

function makeDeck() {
  const suits = ["♠","♥","♦","♣"];
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push(r + s);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function startHand() {
  sim.deck = makeDeck();
  sim.dealIndex = 0;
  sim.timer = 0;
  sim.phase = "preflop";
  sim.handCount++;
  world.pokerTable.resetPot();
  log(`[poker] Hand #${sim.handCount} start`);
}

function revealNext(n) {
  sim.dealIndex = Math.min(5, sim.dealIndex + n);
}

function pickWinnerAndMovePot() {
  sim.winnerSeat = (Math.random() * 6) | 0;
  const angle = (sim.winnerSeat / 6) * Math.PI * 2;
  const r = 2.0;
  const winnerLocal = new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  const winnerWorld = winnerLocal.clone();
  world.pokerTable.group.localToWorld(winnerWorld);
  world.pokerTable.movePotToWinner(winnerWorld);
  log(`[poker] winner seat=${sim.winnerSeat}`);
}

function updatePoker(dt) {
  sim.timer += dt;

  if (sim.phase === "idle") {
    startHand();
    return;
  }

  if (sim.phase === "preflop" && sim.timer > 1.2) {
    revealNext(3);
    sim.phase = "flop";
    log("[poker] flop");
    return;
  }
  if (sim.phase === "flop" && sim.timer > 2.4) {
    revealNext(1);
    sim.phase = "turn";
    log("[poker] turn");
    return;
  }
  if (sim.phase === "turn" && sim.timer > 3.6) {
    revealNext(1);
    sim.phase = "river";
    log("[poker] river");
    return;
  }
  if (sim.phase === "river" && sim.timer > 5.0) {
    sim.phase = "showdown";
    pickWinnerAndMovePot();
    return;
  }
  if (sim.phase === "showdown" && sim.timer > 7.5) {
    sim.phase = "idle";
    sim.timer = 0;
  }
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animation loop ----------
let lastT = performance.now();

renderer.setAnimationLoop((t, frame) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  // Keep controllers hidden permanently
  controller1.visible = false;
  controller2.visible = false;

  // Avatar update (hand tracking)
  if (frame) {
    const refSpace = renderer.xr.getReferenceSpace();
    avatar4_0.update(frame, refSpace, camera);
  }

  // Teleport ray (always escapable)
  state.teleportOk = false;
  marker.visible = false;
  rayLine.visible = false;

  const flags = window.__SCARLETT_FLAGS || {};
  const teleportOn = !!flags.teleport;
  const moveOn = !!flags.move;
  const snapOn = !!flags.snap;

  if (teleportOn && renderer.xr.isPresenting) {
    tmpMat.identity().extractRotation(controller1.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.copy(tmpDir);

    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;
    const denom = dir.y;
    if (Math.abs(denom) > 1e-5) {
      const tHit = (0 - origin.y) / denom;
      if (tHit > 0) {
        const hit = origin.clone().add(dir.clone().multiplyScalar(tHit));

        // clamp if aiming too close to table center
        const v2 = new THREE.Vector2(hit.x, hit.z);
        const dist = v2.length();
        const TABLE_BLOCK_R = 1.05;
        const ESCAPE_R = 1.85;
        const finalHit = hit.clone();

        if (dist < TABLE_BLOCK_R) {
          if (v2.lengthSq() < 1e-6) v2.set(1, 0);
          v2.normalize().multiplyScalar(ESCAPE_R);
          finalHit.x = v2.x;
          finalHit.z = v2.y;
        }

        state.teleportOk = true;
        state.teleportHit.copy(finalHit);
        marker.position.set(finalHit.x, 0.01, finalHit.z);
        marker.visible = true;
      }
    }

    rayLine.visible = true;
    const pts = rayLine.geometry.attributes.position;
    pts.setXYZ(0, 0, 0, 0);
    pts.setXYZ(1, 0, 0, -6);
    pts.needsUpdate = true;
  }

  // Movement input (robust)
  let moveX = 0, moveZ = 0, snapX = 0;

  if (renderer.xr.isPresenting) {
    const session = renderer.xr.getSession();
    const gps = [];
    if (session?.inputSources) {
      for (const src of session.inputSources) if (src?.gamepad) gps.push(src);

      const leftSrc = gps.find(s => s.handedness === "left") || gps[0];
      const rightSrc = gps.find(s => s.handedness === "right") || gps[1];

      const readStick = (src) => {
        const a = src?.gamepad?.axes || [];
        return { x: (a[2] ?? a[0] ?? 0), y: (a[3] ?? a[1] ?? 0) };
      };

      if (leftSrc) {
        const s = readStick(leftSrc);
        moveX = s.x; moveZ = s.y;
      }
      if (rightSrc) {
        const s = readStick(rightSrc);
        snapX = s.x;
      }
    }
  }

  // Mobile dock adds
  moveZ += (touch.f ? -1 : 0) + (touch.b ? 1 : 0);
  moveX += (touch.r ? 1 : 0) + (touch.l ? -1 : 0);
  snapX += (touch.turnR ? 1 : 0) + (touch.turnL ? -1 : 0);

  // Apply move (world moves opposite)
  if (moveOn) {
    const dead = 0.14;
    const mx = Math.abs(moveX) > dead ? moveX : 0;
    const mz = Math.abs(moveZ) > dead ? moveZ : 0;

    if (mx || mz) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0; right.normalize();

      const dir = new THREE.Vector3();
      dir.addScaledVector(right, mx);
      dir.addScaledVector(fwd, mz);
      if (dir.lengthSq() > 1e-6) dir.normalize();

      const delta = dir.multiplyScalar(1.55 * dt);
      world.group.position.sub(delta);
    }
  }

  // Snap turn (rotate world around camera)
  if (snapOn) {
    const dead = 0.65;
    state.snapCooldown = Math.max(0, state.snapCooldown - dt);

    if (state.snapCooldown === 0 && Math.abs(snapX) > dead) {
      const sgn = snapX > 0 ? -1 : 1;
      const angle = sgn * state.snapAngle;

      const camPos = camera.position.clone();
      world.group.position.sub(camPos);
      world.group.rotateY(angle);
      world.group.position.add(camPos);

      state.snapCooldown = 0.22;
    }
  }

  // Update world (NPCs + table hover)
  world.update(dt, camera);

  // Poker sim tick
  updatePoker(dt);

  renderer.render(scene, camera);
});

log("[main] FULL ready ✅");
