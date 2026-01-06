// /js/main.js — Skylark Poker VR (Update 9.0) — HARD FIX for GitHub Pages
// ✅ IMPORTANT: NO `import ... from "three"` anywhere.
// ✅ Everything uses your local module: ./three.js
// ✅ Includes clamp() so you never get "clamp is not defined"
// ✅ Provides stable XR rig + controller anchor + teleport circle (trigger-hold -> release to teleport)

import * as THREE from "./three.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

// Your project modules (all MUST use `./three.js` inside them too)
import { World } from "./world.js";
import { PokerSimulation } from "./poker_simulation.js";

// -------------------------
// Utilities
// -------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function nowTag() {
  return `?v=${Date.now()}`;
}

// -------------------------
// Debug HUD (if your HTML has it, this updates it)
// -------------------------
function hudSet(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}
function hudLog(msg) {
  const box = document.querySelector("#hud_log");
  if (box) box.textContent = (box.textContent + "\n" + msg).trim();
  // Always mirror to console
  console.log(msg);
}
function hudError(err) {
  const box = document.querySelector("#hud_log");
  if (box) box.textContent = (box.textContent + "\n\nIMPORT ERROR:\n" + String(err)).trim();
  console.error(err);
}

// -------------------------
// Three.js Core
// -------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// -------------------------
// Player Rig (anchor EVERYTHING to this)
// -------------------------
const playerRig = new THREE.Group();
playerRig.name = "PlayerRig";
scene.add(playerRig);

// We keep camera under a "head" node so we can clamp height, seat, etc.
const head = new THREE.Group();
head.name = "HeadAnchor";
playerRig.add(head);
head.add(camera);

// Default spawn (adjust if needed)
playerRig.position.set(0, 0, 4.5);
camera.position.set(0, 1.65, 0);

// -------------------------
// Lights (safe baseline so nothing goes black)
// -------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.9));

const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(6, 10, 5);
key.castShadow = false;
scene.add(key);

const fill = new THREE.PointLight(0x88aaff, 0.35, 40);
fill.position.set(-6, 4, 4);
scene.add(fill);

// -------------------------
// Controllers (anchor + teleport)
// -------------------------
const controller0 = renderer.xr.getController(0);
const controller1 = renderer.xr.getController(1);

// Important: attach controllers to rig so they can’t drift away
playerRig.add(controller0);
playerRig.add(controller1);

// Optional tiny “handle” meshes (helps you see them even when models fail)
function makeControllerHandle(color) {
  const g = new THREE.CylinderGeometry(0.015, 0.02, 0.12, 10);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15 });
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = -0.05;
  return mesh;
}
controller0.add(makeControllerHandle(0x00ffaa));
controller1.add(makeControllerHandle(0xff2bd6));

// Teleport circle (NEON triple-ring)
// You asked: no lasers; circle appears while holding trigger, teleport on release
const teleportGroup = new THREE.Group();
teleportGroup.visible = false;
scene.add(teleportGroup);

function makeRing(r, tube, color, intensity) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r, tube, 12, 64),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.35,
      metalness: 0.15,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.01;
  return ring;
}

const ringA = makeRing(0.18, 0.015, 0x00ffaa, 1.2);
const ringB = makeRing(0.26, 0.012, 0x2bd7ff, 1.2);
const ringC = makeRing(0.34, 0.010, 0xff2bd6, 1.2);
teleportGroup.add(ringA, ringB, ringC);

const teleportGlow = new THREE.PointLight(0x00ffaa, 1.1, 4);
teleportGlow.position.set(0, 0.45, 0);
teleportGroup.add(teleportGlow);

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
let teleportActive = false;
let teleportHit = null;

// Ground plane target (invisible) — stable teleport hit even with complex floors
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshBasicMaterial({ visible: false })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

function castTeleport(fromController) {
  // We intentionally tilt the ray slightly DOWN so you don’t have to point at the floor
  // This fixes your “laser pointing up” problem by forcing a downward cast.
  tmpMat.identity().extractRotation(fromController.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat);

  // Force a downward bias (gentle)
  tmpDir.y = clamp(tmpDir.y - 0.35, -1.0, 0.25);
  tmpDir.normalize();

  fromController.getWorldPosition(tmpPos);

  raycaster.set(tmpPos, tmpDir);

  // intersect ground (always exists)
  const hits = raycaster.intersectObject(ground, true);
  if (!hits.length) return null;

  // Clamp distance so teleport feels controlled
  const h = hits[0];
  const dist = h.distance;
  if (dist < 0.5 || dist > 12) return null;

  return h.point.clone();
}

// Trigger hold -> show circle. Release -> teleport.
function onSelectStart(e) {
  teleportActive = true;
  teleportGroup.visible = true;
}
function onSelectEnd(e) {
  teleportActive = false;
  teleportGroup.visible = false;

  if (!teleportHit) return;

  // Teleport playerRig so camera ends up at hit (preserve head height)
  const currentHead = new THREE.Vector3();
  camera.getWorldPosition(currentHead);

  // Move rig by delta from head to desired
  const delta = new THREE.Vector3().subVectors(teleportHit, currentHead);
  playerRig.position.add(delta);

  teleportHit = null;
}

controller0.addEventListener("selectstart", onSelectStart);
controller0.addEventListener("selectend", onSelectEnd);
controller1.addEventListener("selectstart", onSelectStart);
controller1.addEventListener("selectend", onSelectEnd);

// Snap turn (right stick) + move (left stick)
// Also fixes your reversed forward/back by flipping sign.
let snapCooldown = 0;

function handleGamepad(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  const inputSources = session.inputSources || [];
  for (const src of inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.axes) continue;

    // Typical Quest axes:
    // Left stick: axes[2], axes[3] (sometimes [0],[1] depending on source order)
    // Right stick: axes[0], axes[1] (varies)
    // We do a safe “best guess” mapping:
    const ax0 = gp.axes[0] || 0;
    const ay0 = gp.axes[1] || 0;
    const ax2 = gp.axes[2] || 0;
    const ay3 = gp.axes[3] || 0;

    // Move using the stick with the bigger magnitude (robust to mapping changes)
    const leftX = Math.abs(ax2) + Math.abs(ay3) > Math.abs(ax0) + Math.abs(ay0) ? ax2 : ax0;
    const leftY = Math.abs(ax2) + Math.abs(ay3) > Math.abs(ax0) + Math.abs(ay0) ? ay3 : ay0;

    // FIX: your forward/back was reversed → invert forward component
    const moveFwd = -leftY; // forward should be forward
    const moveSide = leftX;

    // Smooth locomotion (small)
    const speed = 1.65; // tuned for comfort
    const yaw = playerRig.rotation.y;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    // Deadzone
    const dz = 0.18;
    const f = Math.abs(moveFwd) < dz ? 0 : moveFwd;
    const s = Math.abs(moveSide) < dz ? 0 : moveSide;

    playerRig.position.addScaledVector(forward, f * speed * dt);
    playerRig.position.addScaledVector(right, s * speed * dt);

    // Snap turn using the OTHER stick (whichever axis not used for movement)
    // Use ax0 if movement uses ax2, else use ax2 as “right stick”
    const rightX = (Math.abs(ax2) + Math.abs(ay3) > Math.abs(ax0) + Math.abs(ay0)) ? ax0 : ax2;

    snapCooldown -= dt;
    if (snapCooldown <= 0) {
      if (rightX > 0.65) {
        playerRig.rotation.y -= THREE.MathUtils.degToRad(45);
        snapCooldown = 0.22;
      } else if (rightX < -0.65) {
        playerRig.rotation.y += THREE.MathUtils.degToRad(45);
        snapCooldown = 0.22;
      }
    }
  }
}

// Height lock: always keep “standing” height feel (prevents sinking into floor)
const LOCK_HEIGHT = 1.65;

function enforceStandingHeight() {
  // Keep head Y steady; this avoids “half in floor / too high” issues
  camera.position.y = LOCK_HEIGHT;
  // Also keep rig above floor
  playerRig.position.y = 0;
}

// -------------------------
// Leaderboard hook (World will render it; Poker sim updates it)
// -------------------------
let setLeaderboardLines = null;

// -------------------------
// Boot
// -------------------------
hudSet("#hud_title", "Skylark Poker VR — Update 9.0");
hudLog("VIP boot running...");

let poker = null;

(async function boot() {
  try {
    // Build world (lobby + table + walls + leaderboard)
    // World.build should return an API or at least set up scene safely.
    const worldAPI = await World.build(scene, playerRig, {
      texturesPath: "assets/textures/",
      onLeaderboardReady: (fn) => (setLeaderboardLines = fn),
    });

    // Poker simulation
    poker = new PokerSimulation({
      camera,
      tableCenter: new THREE.Vector3(0, 0, -4.5),
      onLeaderboard: (lines) => {
        if (typeof setLeaderboardLines === "function") setLeaderboardLines(lines);
      },
    });

    await poker.build(scene);

    hudLog("boot() finished");
    hudSet("#hud_status_html", "HTML loaded");
  } catch (e) {
    hudError(e);
  }
})();

// -------------------------
// Render loop
// -------------------------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.033);

  enforceStandingHeight();
  handleGamepad(dt);

  // Teleport aim: update circle position while trigger held
  if (teleportActive) {
    // Prefer right controller if connected; else left
    const use = controller1 || controller0;
    const hit = castTeleport(use);
    if (hit) {
      teleportHit = hit;
      teleportGroup.position.copy(hit);
      // Rainbow pulse
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.35;
      ringA.material.emissiveIntensity = 1.1 * pulse;
      ringB.material.emissiveIntensity = 1.1 * pulse;
      ringC.material.emissiveIntensity = 1.1 * pulse;
      teleportGlow.intensity = 1.0 * pulse;
    } else {
      teleportHit = null;
    }
  }

  // Update poker sim
  if (poker && typeof poker.update === "function") {
    poker.update(dt);
  }

  renderer.render(scene, camera);
});

// -------------------------
// Resize
// -------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------
// Helpful console printout
// -------------------------
hudLog("Tip: reload with " + nowTag() + " if cache acts weird.");
