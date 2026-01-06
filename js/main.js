// /js/main.js — Skylark Poker VR — Update 9.0 (FULL / FIXED)
// GitHub Pages safe: uses local ./three.js wrapper (NOT "three").
// No CDN VRButton import (prevents Three.js version mismatch).

import * as THREE from "./three.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

let scene, camera, renderer;
let playerGroup;
let clock;

let pokerSim;

// Controller refs
let cLeft = null;
let cRight = null;
let gLeft = null;
let gRight = null;

// Wrist watch (simple mesh on left grip)
let watch = null;
let watchCooldown = 0;

// Leaderboard (simple 3D canvas sign)
let leaderboardMesh = null;

// World build result
let worldRef = null;

init();
animate();

function init() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  addXRButton(renderer);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);

  // Player rig (we move THIS; camera sits inside XR)
  playerGroup = new THREE.Group();
  playerGroup.name = "PlayerRig";
  scene.add(playerGroup);
  playerGroup.add(camera);

  clock = new THREE.Clock();

  // --- Build World ---
  worldRef = World.build(scene);

  // --- UI ---
  UI.init(scene, camera);

  // --- Leaderboard sign (high up, back wall area) ---
  leaderboardMesh = createLeaderboardSign();
  leaderboardMesh.position.set(0, 5.2, -12.8); // higher + farther back
  scene.add(leaderboardMesh);

  // --- Poker Simulation ---
  pokerSim = new PokerSimulation({
    camera,
    tableCenter: worldRef?.tableCenter || new THREE.Vector3(0, 0, -4.8),
    onLeaderboard: (lines) => setLeaderboard(lines),
    startingStack: 1000,
    stepDelay: 1.15
  });

  // IMPORTANT: build may be async, so do it safely
  Promise.resolve(pokerSim.build(scene)).catch((e) => console.error("PokerSim build failed:", e));

  // --- Controls (movement + collisions + teleport) ---
  Controls.init({
    renderer,
    camera,
    player: playerGroup,
    colliders: worldRef?.colliders || [],
    bounds: worldRef?.bounds || null,
    teleport: worldRef?.teleport || null,
    spawn: worldRef?.spawn || null
  });

  // --- XR Controllers ---
  setupXRControllers();

  window.addEventListener("resize", onResize);

  // Helpful: click/tap toggles menu on mobile/desktop too
  window.addEventListener("pointerdown", () => {
    window.dispatchEvent(new Event("nova_toggle_menu"));
  });

  // Failsafe spawn snap (prevents "spawned wrong place" on load)
  setTimeout(() => {
    if (worldRef?.spawn?.position) {
      playerGroup.position.set(worldRef.spawn.position.x, 0, worldRef.spawn.position.z);
      playerGroup.rotation.y = worldRef.spawn.yaw || 0;
    }
  }, 150);
}

function setupXRControllers() {
  cLeft = renderer.xr.getController(0);
  cRight = renderer.xr.getController(1);

  const grip1 = renderer.xr.getControllerGrip(0);
  const grip2 = renderer.xr.getControllerGrip(1);

  // Small visible markers so you can see hands
  const handMarkerGeo = new THREE.SphereGeometry(0.02, 10, 10);
  const leftMat = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.35, metalness: 0.1 });
  const rightMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.35, metalness: 0.1 });

  cLeft.add(new THREE.Mesh(handMarkerGeo, leftMat));
  cRight.add(new THREE.Mesh(handMarkerGeo, rightMat));

  playerGroup.add(cLeft);
  playerGroup.add(cRight);
  playerGroup.add(grip1);
  playerGroup.add(grip2);

  gLeft = grip1;
  gRight = grip2;

  // Build a wrist watch on LEFT grip
  watch = buildWristWatch();
  gLeft.add(watch);
}

function buildWristWatch() {
  const group = new THREE.Group();
  group.name = "WristWatch";
  group.position.set(0.04, 0.03, -0.06);
  group.rotation.set(-0.6, 0.2, 0.2);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.65, metalness: 0.15 })
  );

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.055, 0.035),
    new THREE.MeshStandardMaterial({
      color: 0x1b1b22,
      emissive: 0x2bd7ff,
      emissiveIntensity: 0.75,
      roughness: 0.35,
      metalness: 0.1
    })
  );
  face.position.z = 0.006;

  const label = makeSmallLabel("MENU");
  label.position.set(0, 0, 0.0065);

  group.add(body, face, label);
  group.userData = { face };
  return group;
}

function makeSmallLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0.0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(12, 18, canvas.width - 24, canvas.height - 36);

  ctx.strokeStyle = "rgba(255,210,122,0.9)";
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 18, canvas.width - 24, canvas.height - 36);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.028), mat);
}

function createLeaderboardSign() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.65,
    metalness: 0.1,
    emissive: 0x111111,
    emissiveIntensity: 0.25
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), mat);
  screen.userData = { canvas, ctx, tex };

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 2.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.45 })
  );
  frame.position.z = -0.05;

  const g = new THREE.Group();
  g.add(screen, frame);
  g.userData = { screen };

  setLeaderboard([
    "Boss Tournament",
    "1) —",
    "2) —",
    "3) —",
    "4) —",
    "5) —"
  ]);

  g.rotation.y = Math.PI;

  const light = new THREE.PointLight(0x2bd7ff, 0.8, 14);
  light.position.set(0, 0.1, 1.4);
  g.add(light);

  return g;
}

function setLeaderboard(lines) {
  if (!leaderboardMesh) return;
  const screen = leaderboardMesh.userData.screen;
  if (!screen) return;

  const { canvas, ctx, tex } = screen.userData;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.74)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,210,122,0.95)";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.fillStyle = "#00ffaa";
  ctx.font = "bold 62px Arial";
  ctx.fillText(lines[0] || "Boss Tournament", 40, 88);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial";
  let y = 175;
  for (let i = 1; i < Math.min(lines.length, 7); i++) {
    ctx.fillText(lines[i], 40, y);
    y += 68;
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "bold 34px Arial";
  ctx.fillText("Skylark Poker VR — Update 9.0", 40, canvas.height - 52);

  tex.needsUpdate = true;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);

  // Watch toggle (left trigger)
  handleWatchToggle(dt);

  Controls.update(dt);
  pokerSim?.update(dt);
  UI.update(dt);

  renderer.render(scene, camera);
}

function handleWatchToggle(dt) {
  watchCooldown = Math.max(0, watchCooldown - dt);

  const session = renderer.xr?.getSession?.();
  if (!session) return;

  let leftSource = null;
  for (const src of session.inputSources || []) {
    if (src && src.handedness === "left" && src.gamepad) {
      leftSource = src;
      break;
    }
  }
  if (!leftSource) return;

  const gp = leftSource.gamepad;
  const trigger = gp.buttons?.[0]?.value || 0;

  if (trigger > 0.85 && watchCooldown <= 0) {
    watchCooldown = 0.35;
    window.dispatchEvent(new Event("nova_toggle_menu"));

    if (watch?.userData?.face?.material) {
      watch.userData.face.material.emissiveIntensity = 1.35;
      setTimeout(() => {
        if (watch?.userData?.face?.material) watch.userData.face.material.emissiveIntensity = 0.75;
      }, 120);
    }
  }
}

// Minimal XR button (GitHub-safe, no CDN imports)
function addXRButton(renderer) {
  const btn = document.createElement("button");
  btn.style.cssText = `
    position: absolute; bottom: 20px; right: 20px; z-index: 9999;
    padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.25);
    background: rgba(0,0,0,0.45); color: white; font: 600 14px Arial;
  `;
  btn.textContent = "ENTER VR";
  document.body.appendChild(btn);

  async function isSupported() {
    return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr")));
  }

  isSupported().then((ok) => {
    if (!ok) {
      btn.textContent = "VR NOT SUPPORTED";
      btn.disabled = true;
      btn.style.opacity = "0.5";
    }
  });

  btn.addEventListener("click", async () => {
    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"]
      });
      renderer.xr.setSession(session);
    } catch (e) {
      console.warn("Failed to start VR session:", e);
    }
  });
}
