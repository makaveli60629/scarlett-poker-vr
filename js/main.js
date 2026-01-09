// /js/main.js — Scarlett VR Poker — Permanent Main
// Uses your index.html HUD events + importmap "three" + "three/addons/".

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { initWorld, CyberAvatar } from "./world.js";

// ---------- HUD logger hook ----------
const log = (m) => {
  try { console.log(m); } catch {}
  try {
    // Your index defines appendLog inside module scope, not global.
    // But it also logs to console already. We'll keep console-only here.
  } catch {}
};

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- Scene + Camera ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);
camera.position.set(0, 1.6, 2.4);

// ---------- World ----------
const world = initWorld({ THREE, scene, log });

// ---------- VRButton (use session init from index) ----------
const sessionInit = window.__XR_SESSION_INIT || { optionalFeatures: ["local-floor", "bounded-floor"] };
const vrBtn = VRButton.createButton(renderer, sessionInit);
document.body.appendChild(vrBtn);
log("[main] VRButton appended ✅");

// ---------- Controllers (input allowed, models hidden permanently) ----------
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
controller1.visible = false;
controller2.visible = false;
scene.add(controller1, controller2);

// ---------- Avatar 4.0 ----------
const avatar4_0 = new CyberAvatar({
  THREE,
  scene,
  camera,
  textureURL: "assets/textures/cyber_suit_atlas.png",
  log
});
log("[main] Avatar 4.0 ready ✅");

// Respect your HUD "Hands" toggle
window.addEventListener("scarlett-toggle-hands", (e) => {
  const v = !!e.detail;
  avatar4_0.setHandsVisible(v);
  log("[main] hands toggle -> " + v);
});

// ---------- Recenter ----------
window.addEventListener("scarlett-recenter", () => {
  // Soft recenter by resetting world group position (keeps XR reference space stable)
  world.group.position.set(0, 0, 0);
  world.group.rotation.set(0, 0, 0);
  log("[main] recenter ✅");
});

// ---------- Movement + Teleport state ----------
const state = {
  // toggles are stored in index as __SCARLETT_FLAGS
  move: !!window.__SCARLETT_FLAGS?.move,
  snap: !!window.__SCARLETT_FLAGS?.snap,
  teleport: !!window.__SCARLETT_FLAGS?.teleport,

  // movement
  vel: new THREE.Vector3(),
  moveSpeed: 1.45,     // m/s
  turnSpeed: 2.25,     // rad/s for smooth (we use snap mostly)
  snapAngle: THREE.MathUtils.degToRad(30),
  snapCooldown: 0,

  // teleport
  teleportHit: new THREE.Vector3(),
  teleportOk: false,
  teleportArmed: false,
};

// HUD toggles -> update state
window.addEventListener("scarlett-toggle-move", (e) => (state.move = !!e.detail));
window.addEventListener("scarlett-toggle-snap", (e) => (state.snap = !!e.detail));
window.addEventListener("scarlett-toggle-teleport", (e) => (state.teleport = !!e.detail));

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

// Basic raycast down to floor
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();

// Teleport confirm = select
controller1.addEventListener("selectstart", () => {
  if (!state.teleport) return;
  state.teleportArmed = true;
});
controller1.addEventListener("selectend", () => {
  if (!state.teleport) return;
  if (state.teleportArmed && state.teleportOk) {
    // Teleport by moving world opposite of hit (keeps camera stable)
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

// ---------- Poker simulation (watchable) ----------
const sim = {
  t: 0,
  phase: "idle",
  deck: [],
  community: [null, null, null, null, null],
  dealIndex: 0,
  timer: 0,
  handCount: 0,
  winnerSeat: 0,
};

function makeDeck() {
  const suits = ["♠","♥","♦","♣"];
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push(r + s);
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function startHand() {
  sim.deck = makeDeck();
  sim.community = [null, null, null, null, null];
  sim.dealIndex = 0;
  sim.timer = 0;
  sim.phase = "preflop";
  sim.handCount++;
  world.pokerTable.resetPot();
  log(`[poker] Hand #${sim.handCount} start`);
}

function revealNext(n) {
  for (let k = 0; k < n; k++) {
    if (sim.dealIndex >= 5) return;
    sim.community[sim.dealIndex] = sim.deck.pop();
    sim.dealIndex++;
  }
}

function pickWinner() {
  // Placeholder “winner” for now: pick a random seat around table
  sim.winnerSeat = (Math.random() * 6) | 0; // 0..5
  const angle = (sim.winnerSeat / 6) * Math.PI * 2;
  const r = 1.9;
  const winnerPosLocal = new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  const winnerPosWorld = winnerPosLocal.clone();
  world.pokerTable.group.localToWorld(winnerPosWorld);
  world.pokerTable.movePotToWinner(winnerPosWorld);
  log(`[poker] winner seat=${sim.winnerSeat}`);
}

function updatePoker(dt) {
  sim.timer += dt;

  // Display is visual only; the card text is not textured yet.
  // But the community cards DO hover + face player (your requirement).
  // We "simulate" dealing phases by time.
  if (sim.phase === "idle") {
    startHand();
    return;
  }

  if (sim.phase === "preflop" && sim.timer > 1.2) {
    // Flop (3)
    revealNext(3);
    sim.phase = "flop";
    log("[poker] flop " + sim.community.slice(0,3).join(" "));
    return;
  }

  if (sim.phase === "flop" && sim.timer > 2.4) {
    // Turn (1)
    revealNext(1);
    sim.phase = "turn";
    log("[poker] turn " + sim.community[3]);
    return;
  }

  if (sim.phase === "turn" && sim.timer > 3.6) {
    // River (1)
    revealNext(1);
    sim.phase = "river";
    log("[poker] river " + sim.community[4]);
    return;
  }

  if (sim.phase === "river" && sim.timer > 5.0) {
    sim.phase = "showdown";
    pickWinner();
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

  // Update avatar (hand tracking requires XR frame + refSpace)
  if (frame) {
    const refSpace = renderer.xr.getReferenceSpace();
    avatar4_0.update(frame, refSpace, camera);
  }

  // Teleport ray only when teleport toggle enabled and in XR
  state.teleportOk = false;
  marker.visible = false;
  rayLine.visible = false;

  if (state.teleport && renderer.xr.isPresenting) {
    // Ray from controller1 pose
    tmpMat.identity().extractRotation(controller1.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.copy(tmpDir);

    // Intersect with floor (y=0 plane)
    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;
    const denom = dir.y;
    if (Math.abs(denom) > 1e-5) {
      const tHit = (0 - origin.y) / denom;
      if (tHit > 0) {
        const hit = origin.clone().add(dir.clone().multiplyScalar(tHit));
        // prevent teleport too close to table top area (simple radius block)
        const distToTable = new THREE.Vector2(hit.x, hit.z).length();
        const blocked = distToTable < 1.35; // avoid teleporting into table
        if (!blocked) {
          state.teleportOk = true;
          state.teleportHit.copy(hit);
          marker.position.set(hit.x, 0.01, hit.z);
          marker.visible = true;
        }
      }
    }

    rayLine.visible = true;
    // Update ray line length
    const pts = rayLine.geometry.attributes.position;
    pts.setXYZ(0, 0, 0, 0);
    pts.setXYZ(1, 0, 0, state.teleportOk ? -6 : -3);
    pts.needsUpdate = true;
  }

  // Movement (XR gamepad sticks OR mobile dock)
  const flags = window.__SCARLETT_FLAGS || {};
  state.move = !!flags.move;
  state.snap = !!flags.snap;
  state.teleport = !!flags.teleport;

  let moveX = 0, moveZ = 0, snapX = 0;

  // XR gamepad (controller1 usually left hand)
  if (renderer.xr.isPresenting) {
    const session = renderer.xr.getSession();
    if (session?.inputSources) {
      for (const src of session.inputSources) {
        if (!src?.gamepad) continue;
        const axes = src.gamepad.axes || [];
        const handed = src.handedness;

        // left stick -> move
        if (handed === "left") {
          moveX = axes[2] ?? axes[0] ?? 0;
          moveZ = axes[3] ?? axes[1] ?? 0;
        }
        // right stick -> snap
        if (handed === "right") {
          snapX = axes[2] ?? axes[0] ?? 0;
        }
      }
    }
  }

  // Mobile dock overrides/adds
  moveZ += (touch.f ? -1 : 0) + (touch.b ? 1 : 0);
  moveX += (touch.r ? 1 : 0) + (touch.l ? -1 : 0);
  snapX += (touch.turnR ? 1 : 0) + (touch.turnL ? -1 : 0);

  // Apply movement by moving world group opposite of desired direction
  if (state.move) {
    const dead = 0.14;
    const mx = Math.abs(moveX) > dead ? moveX : 0;
    const mz = Math.abs(moveZ) > dead ? moveZ : 0;

    if (mx || mz) {
      // camera forward on XZ plane
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0; right.normalize();

      const dir = new THREE.Vector3();
      dir.addScaledVector(right, mx);
      dir.addScaledVector(fwd, mz);
      dir.normalize();

      const delta = dir.multiplyScalar(state.moveSpeed * dt);
      world.group.position.sub(delta); // move world opposite
    }
  }

  // Snap turn by rotating world around camera
  if (state.snap) {
    const dead = 0.65;
    state.snapCooldown = Math.max(0, state.snapCooldown - dt);

    if (state.snapCooldown === 0 && Math.abs(snapX) > dead) {
      const sgn = snapX > 0 ? -1 : 1; // invert for natural feel
      const angle = sgn * state.snapAngle;

      const camPos = camera.position.clone();
      // translate world so cam at origin, rotate, translate back
      world.group.position.sub(camPos);
      world.group.rotateY(angle);
      world.group.position.add(camPos);

      state.snapCooldown = 0.22;
    }
  }

  // Update table visuals (cards hover + face player; pot animation)
  world.pokerTable.update(dt, camera);

  // Poker simulation
  updatePoker(dt);

  renderer.render(scene, camera);
});

log("[main] ready ✅");
