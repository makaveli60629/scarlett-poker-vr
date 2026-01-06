// /js/main.js — Skylark Poker VR — Update 9.0 (FULL)
// GitHub Pages safe: uses local ./three.js wrapper (NOT "three").
//
// What this does:
// - Builds World (walls/floor/rails/teleport machine/colliders)
// - Initializes Controls (move + snap turn + teleport + collision)
// - Initializes UI (toggle via keyboard M + VR button mapping)
// - Runs PokerSimulation (8 bots, slow watchable hands, crown, bust walk-out)
// - Adds a simple "wrist watch" button area on the LEFT controller (trigger tap toggles menu)
//
// REQUIREMENTS (files expected):
// /js/three.js
// /js/world.js
// /js/controls.js
// /js/ui.js
// /js/poker_simulation.js
//
// /assets/textures/… your jpgs

import * as THREE from "./three.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

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
let gLeft = null;   // controller grip
let gRight = null;

// Wrist watch (simple mesh on left grip)
let watch = null;
let watchCooldown = 0;

// Leaderboard (simple 3D canvas sign)
let leaderboardMesh = null;

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

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);

  // Player rig (we move THIS; camera sits inside XR)
  playerGroup = new THREE.Group();
  playerGroup.name = "PlayerRig";
  scene.add(playerGroup);
  playerGroup.add(camera);

  clock = new THREE.Clock();

  // --- Build World ---
  const w = World.build(scene);

  // --- UI ---
  UI.init(scene, camera);

  // --- Leaderboard sign (high up, back wall area) ---
  leaderboardMesh = createLeaderboardSign();
  // place near back wall, high up, centered
  leaderboardMesh.position.set(0, 4.9, -11.5);
  scene.add(leaderboardMesh);

  // --- Poker Simulation ---
  pokerSim = new PokerSimulation({
    camera,
    tableCenter: w.tableCenter,
    onLeaderboard: (lines) => setLeaderboard(lines)
  });
  pokerSim.build(scene);

  // --- Controls (movement + collisions + teleport) ---
  Controls.init({
    renderer,
    camera,
    player: playerGroup,
    colliders: w.colliders,
    bounds: w.bounds,
    teleport: w.teleport,
    spawn: w.spawn
  });

  // --- XR Controllers ---
  setupXRControllers();

  window.addEventListener("resize", onResize);

  // Helpful: click/tap toggles menu on mobile/desktop too
  window.addEventListener("pointerdown", () => {
    window.dispatchEvent(new Event("nova_toggle_menu"));
  });
}

function setupXRControllers() {
  // Controllers (ray origin)
  cLeft = renderer.xr.getController(0);
  cRight = renderer.xr.getController(1);

  // Controller grips (actual tracked controller models)
  const grip1 = renderer.xr.getControllerGrip(0);
  const grip2 = renderer.xr.getControllerGrip(1);

  // Make small visible markers so you can see hands
  const handMarkerGeo = new THREE.SphereGeometry(0.02, 10, 10);
  const leftMat = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.35, metalness: 0.1 });
  const rightMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.35, metalness: 0.1 });

  const m1 = new THREE.Mesh(handMarkerGeo, leftMat);
  const m2 = new THREE.Mesh(handMarkerGeo, rightMat);

  cLeft.add(m1);
  cRight.add(m2);

  // Add to player rig (so they move with teleport/locomotion)
  playerGroup.add(cLeft);
  playerGroup.add(cRight);
  playerGroup.add(grip1);
  playerGroup.add(grip2);

  gLeft = grip1;
  gRight = grip2;

  // Build a simple wrist watch on LEFT grip
  watch = buildWristWatch();
  gLeft.add(watch);

  // --- Button mapping for menu ---
  // IMPORTANT: Quest "menu" button often isn't exposed in WebXR.
  // So we do: LEFT trigger quick tap => toggle UI (watch teleport menu)
  // You can change this mapping later.
}

function buildWristWatch() {
  const group = new THREE.Group();
  group.name = "WristWatch";
  group.position.set(0.04, 0.03, -0.06);  // near wrist
  group.rotation.set(-0.6, 0.2, 0.2);

  // watch body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.65, metalness: 0.15 })
  );

  // glowing face
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

  // tiny “MENU” label texture (canvas)
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

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mat);
  mesh.userData = { canvas, ctx, tex };

  // frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.65, 2.45, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.45 })
  );
  frame.position.z = -0.05;

  const g = new THREE.Group();
  g.add(mesh, frame);
  g.userData = { screen: mesh };

  // initial text
  setLeaderboard([
    "Boss Tournament",
    "1) —",
    "2) —",
    "3) —",
    "4) —",
    "5) —"
  ]);

  // make it face into room
  g.rotation.y = Math.PI;

  // attach a light for readability
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

  // background
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // border
  ctx.strokeStyle = "rgba(255,210,122,0.9)";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  // header
  ctx.fillStyle = "#00ffaa";
  ctx.font = "bold 58px Arial";
  ctx.fillText(lines[0] || "Boss Tournament", 40, 80);

  // entries
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px Arial";

  let y = 160;
  for (let i = 1; i < Math.min(lines.length, 7); i++) {
    ctx.fillText(lines[i], 40, y);
    y += 66;
  }

  // footer
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

  // Toggle UI via LEFT trigger quick-tap (watch button surrogate)
  handleWatchToggle(dt);

  // Core updates
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

  // quick tap detection
  // if trigger pressed past threshold and cooldown elapsed, toggle menu
  if (trigger > 0.85 && watchCooldown <= 0) {
    watchCooldown = 0.35;
    window.dispatchEvent(new Event("nova_toggle_menu"));

    // flash watch face
    if (watch && watch.userData && watch.userData.face) {
      watch.userData.face.material.emissiveIntensity = 1.35;
      setTimeout(() => {
        if (watch?.userData?.face?.material) watch.userData.face.material.emissiveIntensity = 0.75;
      }, 120);
    }
  }
}
