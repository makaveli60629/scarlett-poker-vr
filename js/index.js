// /js/index.js — Scarlett FULL MASTER 9.0 (VIP Spawn + Teleport Laser + Android Move + HUD + Nametags + Poker Demo)
// ✅ Uses local wrapper: /js/three.js (NO bare "three" imports)
// ✅ Quest + Android locomotion (left stick move, right stick snap turn 45°)
// ✅ Teleport laser (select = teleport) + marker on floors
// ✅ Spawns in VIP cube, facing table
// ✅ UI HUD (money/rank/time/pot) + hide/show toggle
// ✅ Look-at nametags (appear when gazed, hide otherwise)
// ✅ PokerDemo: seated bots + cards hovering above heads + chips animate into pot + HUD updates
//
// Requires these files present:
// - /js/three.js
// - /js/world.js (WORLD 8.6 from my last message)
// - /js/ui_hud.js
// - /js/nametags.js
// - /js/poker_demo.js

import { THREE, VRButton } from "./three.js";
import { World } from "./world.js";
import { UIHud } from "./ui_hud.js";
import { NameTags } from "./nametags.js";
import { PokerDemo } from "./poker_demo.js";

const BUILD = "FULL MASTER 9.0 (VIP + HUD + Nametags + Poker Demo)";
console.log("[index]", BUILD);

let scene, camera, renderer, player, clock;

const MOVE_SPEED = 2.65;
const DEAD_MOVE = 0.14;
const DEAD_TURN = 0.20;

const SNAP_ANGLE = Math.PI / 4;
const SNAP_DEAD = 0.75;
const SNAP_CD = 0.22;
let snapCooldown = 0;

// Shared temporaries
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _v = new THREE.Vector3();

const tp = {
  raycaster: null,
  marker: null,
  c0: null,
  c1: null,
  line0: null,
  line1: null,
  hit: null,
  tmpM: null,
  tmpO: null,
  tmpD: null,
  tmpPos: null,
};

// HUD toggle
let hudVisible = true;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 700);

  player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);
  player.add(camera);
  camera.position.set(0, 1.65, 0);

  // Renderer (Quest-stable)
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // XR perf stability
  renderer.xr.setFramebufferScaleFactor?.(0.85);

  // Build world
  World.build({ THREE, scene, log: console.log });

  // Spawn
  resetSpawn();

  // Teleport laser
  installTeleportLaser();

  // HUD + key bindings
  UIHud.init();
  installHudToggle();

  // Nametags
  NameTags.init({ THREE, scene, camera });

  // Poker demo
  PokerDemo.init({ THREE, scene, world: World, hud: UIHud });

  // Register nametags for player bots that PokerDemo created
  registerPokerBotsForNametags();

  // XR session handling
  renderer.xr.addEventListener("sessionstart", () => {
    // In XR, camera is controlled by headset
    camera.position.set(0, 0, 0);
    resetSpawn();
  });

  renderer.xr.addEventListener("sessionend", () => {
    camera.position.set(0, 1.65, 0);
  });

  addEventListener("resize", onResize);

  // Touch fallback (Android) for HUD toggle
  renderer.domElement.addEventListener("touchstart", (e) => {
    // Two-finger tap toggles HUD
    if (e.touches && e.touches.length >= 2) {
      toggleHud();
    }
  }, { passive: true });

  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function resetSpawn() {
  const s = World.getSpawn?.("vip_cube") || World.getSpawn?.() || { x: 0, y: 0, z: 8, yaw: Math.PI };
  player.position.set(s.x, s.y ?? 0, s.z);
  player.rotation.set(0, s.yaw ?? Math.PI, 0);
  console.log("[spawn] vip_cube", s);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.04);

  // Movement + snap turn
  moveXR(dt);

  // Teleport laser marker
  updateLaser();

  // Demo systems
  PokerDemo.update(dt);
  NameTags.update();

  renderer.render(scene, camera);
}

// ---------------------
// HUD show/hide
// ---------------------
function installHudToggle() {
  // Desktop: H toggles HUD
  addEventListener("keydown", (e) => {
    if (e.key === "h" || e.key === "H") toggleHud();
  });

  // Add a small button for 2D
  const btn = document.createElement("button");
  btn.textContent = "HUD";
  btn.style.cssText = `
    position:fixed; right:10px; bottom:78px; z-index:10000;
    padding:10px 12px; border-radius:14px; border:1px solid rgba(127,231,255,.35);
    background:rgba(8,10,18,.55); color:#e8ecff; font-weight:700;
    box-shadow:0 12px 40px rgba(0,0,0,.55);
  `;
  btn.addEventListener("click", toggleHud);
  document.body.appendChild(btn);
}

function toggleHud() {
  hudVisible = !hudVisible;
  const hud = document.getElementById("scarlett-hud");
  if (hud) hud.style.display = hudVisible ? "flex" : "none";
  console.log("[hud] visible =", hudVisible);
}

// ---------------------
// Movement (Quest + Android)
// ---------------------
function moveXR(dt) {
  // allow 2D movement too (android non-xr) if you want:
  // If not XR presenting, nothing happens (keeps simple).
  if (!renderer.xr.isPresenting) return;

  const session = renderer.xr.getSession?.();
  if (!session) return;

  const sources = [];
  for (const src of session.inputSources) {
    const gp = src?.gamepad;
    if (!gp || !gp.axes) continue;
    sources.push({ src, gp });
  }
  if (!sources.length) return;

  const leftSrc  = sources.find(s => s.src.handedness === "left")  || null;
  const rightSrc = sources.find(s => s.src.handedness === "right") || null;

  const pickStick = (gp) => {
    const a = gp.axes || [];
    const x01 = a[0] ?? 0, y01 = a[1] ?? 0;
    const x23 = a[2] ?? 0, y23 = a[3] ?? 0;
    if (a.length <= 2) return { x: x01, y: y01 };
    const m01 = Math.abs(x01) + Math.abs(y01);
    const m23 = Math.abs(x23) + Math.abs(y23);
    return (m23 > m01) ? { x: x23, y: y23 } : { x: x01, y: y01 };
  };

  let moveSource = leftSrc;
  if (!moveSource) {
    // fallback pick the one with strongest motion
    let best = sources[0], bestMag = 0;
    for (const s of sources) {
      const st = pickStick(s.gp);
      const mag = Math.abs(st.x) + Math.abs(st.y);
      if (mag > bestMag) { bestMag = mag; best = s; }
    }
    moveSource = best;
  }

  let turnSource = rightSrc || sources.find(s => s !== moveSource) || moveSource;

  const mv = pickStick(moveSource.gp);
  const mx = dz(mv.x, DEAD_MOVE);
  const my = dz(mv.y, DEAD_MOVE);

  // Forward on Quest is usually -Y
  const forward = -my;

  // Snap turn on right stick X (or strongest x axis)
  const aT = turnSource.gp.axes || [];
  let turnX = 0;
  if (aT.length >= 4) {
    const candA = aT[2] ?? 0;
    const candB = aT[0] ?? 0;
    const cand = (Math.abs(candA) > Math.abs(candB)) ? candA : candB;
    turnX = dz(cand, DEAD_TURN);
  } else {
    turnX = dz(aT[0] ?? 0, DEAD_TURN);
  }

  snapCooldown -= dt;
  if (snapCooldown <= 0) {
    if (turnX > SNAP_DEAD) { player.rotation.y -= SNAP_ANGLE; snapCooldown = SNAP_CD; }
    else if (turnX < -SNAP_DEAD) { player.rotation.y += SNAP_ANGLE; snapCooldown = SNAP_CD; }
  }

  if (mx || forward) {
    const heading = getHeadYaw();
    _f.set(Math.sin(heading), 0, Math.cos(heading));
    _r.set(_f.z, 0, -_f.x);

    _v.set(0, 0, 0)
      .addScaledVector(_r, mx)
      .addScaledVector(_f, forward);

    if (_v.lengthSq() > 1e-6) {
      _v.normalize().multiplyScalar(MOVE_SPEED * dt);
      player.position.add(_v);
    }
  }
}

function dz(v, d) { return Math.abs(v) < d ? 0 : v; }

function getHeadYaw() {
  camera.getWorldQuaternion(_q);
  _e.setFromQuaternion(_q, "YXZ");
  return _e.y;
}

// ---------------------
// Teleport laser + marker (parented to rig so it follows you)
// ---------------------
function installTeleportLaser() {
  tp.raycaster = new THREE.Raycaster();
  tp.tmpM = new THREE.Matrix4();
  tp.tmpO = new THREE.Vector3();
  tp.tmpD = new THREE.Vector3();
  tp.tmpPos = new THREE.Vector3();

  tp.marker = new THREE.Mesh(
    new THREE.RingGeometry(0.20, 0.32, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.92 })
  );
  tp.marker.rotation.x = -Math.PI / 2;
  tp.marker.visible = false;
  scene.add(tp.marker);

  tp.c0 = renderer.xr.getController(0);
  tp.c1 = renderer.xr.getController(1);
  player.add(tp.c0, tp.c1);

  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);

  tp.line0 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 }));
  tp.line0.scale.z = 12;
  tp.c0.add(tp.line0);

  tp.line1 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 }));
  tp.line1.scale.z = 12;
  tp.c1.add(tp.line1);

  const teleport = () => {
    if (!tp.hit) return;
    player.position.set(tp.hit.x, player.position.y, tp.hit.z);
    tp.marker.visible = false;
  };
  tp.c0.addEventListener("selectstart", teleport);
  tp.c1.addEventListener("selectstart", teleport);

  console.log("[laser] installed ✅");
}

function updateLaser() {
  if (!renderer.xr.isPresenting) {
    tp.marker.visible = false;
    tp.hit = null;
    return;
  }

  const floors = World.getFloors ? World.getFloors() : [];
  tp.hit = null;

  // prefer right controller
  const cands = [tp.c1, tp.c0];
  for (const c of cands) {
    if (!controllerTracked(c)) continue;

    tp.tmpM.identity().extractRotation(c.matrixWorld);
    tp.tmpO.setFromMatrixPosition(c.matrixWorld);
    tp.tmpD.set(0, 0, -1).applyMatrix4(tp.tmpM).normalize();

    tp.raycaster.set(tp.tmpO, tp.tmpD);
    const hits = tp.raycaster.intersectObjects(floors, true);

    if (hits?.length) {
      const p = hits[0].point;
      tp.hit = p;
      tp.marker.position.set(p.x, p.y + 0.02, p.z);
      tp.marker.visible = true;
      return;
    }
  }

  tp.marker.visible = false;
}

function controllerTracked(ctrl) {
  if (!ctrl) return false;
  tp.tmpPos.setFromMatrixPosition(ctrl.matrixWorld);
  const d = Math.abs(tp.tmpPos.x) + Math.abs(tp.tmpPos.y) + Math.abs(tp.tmpPos.z);
  return d > 0.0005;
}

// ---------------------
// Nametag registration
// ---------------------
function registerPokerBotsForNametags() {
  const demo = World.getDemo?.();
  if (!demo?.tableAnchor) return;

  let idx = 1;
  demo.tableAnchor.traverse((o) => {
    if (o?.name?.startsWith("PlayerBot_")) {
      NameTags.register(o, `PLAYER ${idx++}`);
    }
  });
  console.log("[nametags] registered ✅");
}
