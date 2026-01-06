// /js/main.js — Skylark Poker VR — Update 9.0 (FULL MAIN) — “Step 6 FULL CODE”
// Fixes your current crash: seats was undefined -> now we pass w.seats + w.tableAnchors safely.
//
// Requires these files present:
// /js/three.js
// /js/world.js
// /js/controls.js
// /js/ui.js
// /js/poker_simulation.js
// /js/interactions.js
//
// Notes:
// - Player will NOT be dealt cards until you sit (Interactions + PokerSimulation setPlayerSeat)
// - UI toggles with keyboard M OR left-trigger quick tap (watch toggle)

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";
import { Interactions } from "./interactions.js";

let scene, camera, renderer;
let playerGroup;
let clock;

let pokerSim = null;

// Controllers / grips
let cLeft = null;
let cRight = null;
let gLeft = null;
let gRight = null;

// Wrist watch + toggle
let watch = null;
let watchCooldown = 0;

// Leaderboard
let leaderboardMesh = null;

// World handle
let worldData = null;

init();
animate();

function init() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  // Player rig (we move THIS; camera sits inside XR)
  playerGroup = new THREE.Group();
  playerGroup.name = "PlayerRig";
  scene.add(playerGroup);
  playerGroup.add(camera);

  clock = new THREE.Clock();

  // --- Build World (returns table, seats, colliders, spawn, etc) ---
  worldData = World.build(scene) || {};

  // Safe fallback (prevents crash if world missing fields)
  if (!worldData.tableCenter) worldData.tableCenter = new THREE.Vector3(0, 0, -6);
  if (!worldData.tableAnchors) {
    worldData.tableAnchors = {
      community: new THREE.Object3D(),
      pot: new THREE.Object3D(),
      banner: new THREE.Object3D()
    };
    worldData.tableAnchors.community.position.set(0, 0.9, -5.9);
    worldData.tableAnchors.pot.position.set(0, 1.0, -6.1);
    worldData.tableAnchors.banner.position.set(0, 1.2, -6.1);
    scene.add(worldData.tableAnchors.community, worldData.tableAnchors.pot, worldData.tableAnchors.banner);
  }
  if (!Array.isArray(worldData.seats)) worldData.seats = [];
  if (!Array.isArray(worldData.interactables)) worldData.interactables = [];
  if (!Array.isArray(worldData.colliders)) worldData.colliders = [];
  if (!worldData.bounds) {
    worldData.bounds = {
      min: new THREE.Vector3(-15, 0, -15),
      max: new THREE.Vector3(15, 0, 15)
    };
  }
  if (!worldData.spawn) {
    worldData.spawn = { position: new THREE.Vector3(0, 0, worldData.tableCenter.z + 9.5), yaw: Math.PI };
  }

  // --- UI ---
  UI.init(scene, camera);

  // --- Leaderboard sign ---
  leaderboardMesh = createLeaderboardSign();
  leaderboardMesh.position.set(0, 4.9, -11.5);
  scene.add(leaderboardMesh);

  // --- Poker Simulation (NOW receives seats + anchors) ---
  pokerSim = new PokerSimulation({
    camera,
    tableCenter: worldData.tableCenter,
    tableAnchors: worldData.tableAnchors,
    seats: worldData.seats,
    onLeaderboard: (lines) => setLeaderboard(lines)
  });
  pokerSim.build(scene);

  // --- Controls (movement + collisions + teleport) ---
  Controls.init({
    renderer,
    camera,
    player: playerGroup,
    colliders: worldData.colliders,
    bounds: worldData.bounds,
    teleport: worldData.teleport,
    spawn: worldData.spawn
  });

  // --- Interactions (GRIP to sit / stand) ---
  Interactions.init({
    renderer,
    camera,
    player: playerGroup,
    world: worldData,
    pokerSim
  });

  // --- XR Controllers ---
  setupXRControllers();

  window.addEventListener("resize", onResize);

  // Desktop/mobile quick toggle too
  window.addEventListener("pointerdown", () => {
    window.dispatchEvent(new Event("nova_toggle_menu"));
  });

  // Start at safe spawn facing inward
  if (worldData.spawn?.position) {
    playerGroup.position.set(worldData.spawn.position.x, 0, worldData.spawn.position.z);
  }
}

function setupXRControllers() {
  cLeft = renderer.xr.getController(0);
  cRight = renderer.xr.getController(1);

  const grip1 = renderer.xr.getControllerGrip(0);
  const grip2 = renderer.xr.getControllerGrip(1);

  // Simple markers
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

  // Wrist watch on LEFT grip
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
    emissiveIntensity: 0.2
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mat);
  screen.userData = { canvas, ctx, tex };

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.65, 2.45, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.45 })
  );
  frame.position.z = -0.05;

  const g = new THREE.Group();
  g.add(screen, frame);
  g.userData = { screen };

  setLeaderboard(["Boss Tournament", "1) —", "2) —", "3) —", "4) —", "5) —"]);

  g.rotation.y = Math.PI;

  const light = new THREE.PointLight(0x2bd7ff, 0.6, 12);
  light.position.set(0, 0, 1.2);
  g.add(light);

  return g;
}

function setLeaderboard(lines) {
  if (!leaderboardMesh) return;
  const screen = leaderboardMesh.userData.screen;
  if (!screen) return;

  const { canvas, ctx, tex } = screen.userData;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,210,122,0.9)";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.fillStyle = "#00ffaa";
  ctx.font = "bold 58px Arial";
  ctx.fillText(lines[0] || "Boss Tournament", 40, 80);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px Arial";

  let y = 160;
  for (let i = 1; i < Math.min(lines.length, 7); i++) {
    ctx.fillText(lines[i], 40, y);
    y += 66;
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "bold 32px Arial";
  ctx.fillText("Skylark Poker VR — Update 9.0", 40, canvas.height - 50);

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

  handleWatchToggle(dt);

  Controls.update(dt);
  Interactions.update(dt);
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
