// /js/main.js — Scarlett VR Poker (FULL ACTIVE 9.0, cache-safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));

// cache-bust from URL: main.js?v=123
const V = new URL(import.meta.url).searchParams.get("v") || (window.__BUILD_V || Date.now().toString());
log("[main] boot v=" + V);

let renderer, scene, camera;
let world = null;

const clock = new THREE.Clock();

// XR rig
const player = new THREE.Group();
const head = new THREE.Group();

// controllers
let c0 = null, c1 = null;

// locomotion tuning
const MOVE_SPEED = 2.25; // m/s
const TURN_ANGLE = THREE.MathUtils.degToRad(45);
const DEADZONE = 0.20;
let snapArmed = true;

// teleport system visuals
let teleport = null;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  log("[main] renderer ok ✅");

  // VR Button
  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  document.body.appendChild(btn);
  log("[main] VRButton appended ✅");

  // Scene / Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
  head.add(camera);
  player.add(head);
  scene.add(player);

  // Safe lights (never black)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 0.90);
  key.position.set(6, 10, 4);
  scene.add(key);

  // Teleport visuals (arc + ring)
  teleport = createTeleportSystem(THREE);
  scene.add(teleport.arcLine, teleport.ring);

  // Load world (cache-safe)
  try {
    const mod = await import(`./world.js?v=${encodeURIComponent(V)}`);
    world = await mod.initWorld({ THREE, scene, log, v: V });
    log("[main] world init ✅");
  } catch (e) {
    log("❌ world import/init failed: " + (e?.message || e));
  }

  // Spawn (use world spawn)
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 2);
  player.position.set(spawn.x, 0, spawn.z);

  // Face the table if available
  if (world?.tableFocus) {
    const toTable = new THREE.Vector3().subVectors(
      world.tableFocus,
      new THREE.Vector3(spawn.x, 0, spawn.z)
    );
    player.rotation.y = Math.atan2(toTable.x, toTable.z);
  }

  setupXRControls();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  // XR support info
  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    log("[main] XR immersive-vr supported = " + ok);
  } else {
    log("[main] navigator.xr missing (Android Chrome usually no WebXR)");
  }

  log("[main] ready ✅ v=" + V);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

// -------------------- XR CONTROLS --------------------
function setupXRControls() {
  c0 = renderer.xr.getController(0);
  c1 = renderer.xr.getController(1);
  scene.add(c0, c1);

  c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
  c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));
  c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
  c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

  // Teleport trigger (select)
  c0.addEventListener("selectstart", () => onSelectStart(c0));
  c1.addEventListener("selectstart", () => onSelectStart(c1));
  c0.addEventListener("selectend", () => onSelectEnd(c0));
  c1.addEventListener("selectend", () => onSelectEnd(c1));

  log("[main] controllers ready ✅");
}

function getGamepad(controller) {
  const src = controller?.userData?.inputSource;
  return src && src.gamepad ? src.gamepad : null;
}
function isRightHand(controller) {
  const src = controller?.userData?.inputSource;
  if (!src) return controller === c1;
  return src.handedness ? src.handedness === "right" : controller === c1;
}
function findControllerByHand(hand) {
  const a = c0?.userData?.inputSource?.handedness === hand ? c0 : null;
  const b = c1?.userData?.inputSource?.handedness === hand ? c1 : null;
  return a || b || null;
}
function getHeadYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

// -------------------- TELEPORT --------------------
function onSelectStart(controller) {
  if (!isRightHand(controller)) return;
  teleport.active = true;
}
function onSelectEnd(controller) {
  if (!isRightHand(controller)) return;

  if (teleport.active && teleport.valid && teleport.hitPoint) {
    const p = teleport.hitPoint.clone();

    // clamp inside room
    if (world?.roomClamp) {
      p.x = THREE.MathUtils.clamp(p.x, world.roomClamp.minX, world.roomClamp.maxX);
      p.z = THREE.MathUtils.clamp(p.z, world.roomClamp.minZ, world.roomClamp.maxZ);
    }

    // collide vs world
    if (world?.resolvePlayer) {
      const resolved = world.resolvePlayer(p, 0.28);
      p.copy(resolved);
    }

    player.position.set(p.x, 0, p.z);

    // keep facing table (feels good)
    if (world?.tableFocus) {
      const toTable = new THREE.Vector3().subVectors(world.tableFocus, new THREE.Vector3(p.x, 0, p.z));
      player.rotation.y = Math.atan2(toTable.x, toTable.z);
    }
  }

  teleport.active = false;
  teleport.valid = false;
  teleport.hitPoint = null;
  teleport.ring.visible = false;
  teleport.arcLine.visible = false;
}

// -------------------- LOCOMOTION --------------------
function applyLocomotion(dt) {
  const left = findControllerByHand("left") || c0;
  const right = findControllerByHand("right") || c1;

  // ---- left stick move ----
  const gpL = getGamepad(left);
  if (gpL?.axes?.length >= 2) {
    const x = gpL.axes[2] ?? gpL.axes[0];
    const y = gpL.axes[3] ?? gpL.axes[1];

    const ax = Math.abs(x) > DEADZONE ? x : 0;
    const ay = Math.abs(y) > DEADZONE ? y : 0;

    if (ax || ay) {
      const headYaw = getHeadYaw();
      const forward = new THREE.Vector3(Math.sin(headYaw), 0, Math.cos(headYaw));
      const rightv = new THREE.Vector3(forward.z, 0, -forward.x);

      // ✅ FIX: forward/back was reversed before
      const move = new THREE.Vector3();
      move.addScaledVector(forward, (ay) * MOVE_SPEED * dt);      // forward when stick forward
      move.addScaledVector(rightv, (ax) * MOVE_SPEED * dt);

      const next = player.position.clone().add(move);

      // room clamp
      if (world?.roomClamp) {
        next.x = THREE.MathUtils.clamp(next.x, world.roomClamp.minX, world.roomClamp.maxX);
        next.z = THREE.MathUtils.clamp(next.z, world.roomClamp.minZ, world.roomClamp.maxZ);
      }

      // wall collision (hard)
      if (world?.resolvePlayer) {
        const resolved = world.resolvePlayer(next, 0.28);
        player.position.copy(resolved);
      } else {
        player.position.copy(next);
      }
    }
  }

  // ---- right stick snap turn ----
  const gpR = getGamepad(right);
  if (gpR?.axes?.length >= 2) {
    const x = gpR.axes[2] ?? gpR.axes[0];
    const ax = Math.abs(x) > 0.65 ? x : 0;

    if (ax === 0) snapArmed = true;
    if (snapArmed && ax !== 0) {
      player.rotation.y += ax > 0 ? -TURN_ANGLE : TURN_ANGLE;
      snapArmed = false;
    }
  }

  // ---- teleport arc update ----
  const rightHand = findControllerByHand("right") || c1;
  if (teleport.active && rightHand) updateTeleportArc(THREE, rightHand, teleport, world);
}

// -------------------- TELEPORT VISUALS --------------------
function createTeleportSystem(THREE) {
  const arcMat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.9 });
  const arcGeo = new THREE.BufferGeometry();
  const arcPts = new Float32Array(60 * 3);
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.visible = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.36, 40),
    new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;

  return { active: false, valid: false, hitPoint: null, arcLine, ring };
}

function updateTeleportArc(THREE, controller, tp, world) {
  tp.arcLine.visible = true;

  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  const dir = new THREE.Vector3(0, 0, -1);
  const q = new THREE.Quaternion();
  controller.getWorldQuaternion(q);
  dir.applyQuaternion(q).normalize();

  const g = -9.8, v = 7.0, step = 0.06, maxT = 2.0;

  const positions = tp.arcLine.geometry.attributes.position.array;
  let hit = null;
  let idx = 0;

  for (let t = 0; t <= maxT; t += step) {
    const p = new THREE.Vector3(
      origin.x + dir.x * v * t,
      origin.y + dir.y * v * t + 0.5 * g * t * t,
      origin.z + dir.z * v * t
    );

    positions[idx++] = p.x;
    positions[idx++] = p.y;
    positions[idx++] = p.z;

    if (!hit && p.y <= 0.02) { hit = p; break; }
  }

  while (idx < positions.length) {
    positions[idx] = positions[idx - 3];
    idx++;
  }
  tp.arcLine.geometry.attributes.position.needsUpdate = true;

  if (hit) {
    if (world?.roomClamp) {
      hit.x = THREE.MathUtils.clamp(hit.x, world.roomClamp.minX, world.roomClamp.maxX);
      hit.z = THREE.MathUtils.clamp(hit.z, world.roomClamp.minZ, world.roomClamp.maxZ);
    }
    tp.valid = true;
    tp.hitPoint = hit;

    tp.ring.visible = true;
    tp.ring.position.set(hit.x, 0.03, hit.z);
  } else {
    tp.valid = false;
    tp.hitPoint = null;
    tp.ring.visible = false;
  }
}

// -------------------- LOOP --------------------
function tick() {
  const dt = clock.getDelta();

  applyLocomotion(dt);

  if (world?.tick) world.tick(dt);

  renderer.render(scene, camera);
    }// /js/store.js — Update 9.0 store (safe visuals, no UI clicks yet)

import { ShopCatalog } from "./shop_catalog.js";
import { createTextureKit } from "./textures.js";

export async function initStore({ THREE, scene, world, log = console.log }) {
  const kit = createTextureKit(THREE, { log });

  const g = new THREE.Group();
  g.name = "Store";
  g.position.set(-5.5, 0, 2.5); // left side of lobby
  world.group.add(g);

  // kiosk base
  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.85 })
  );
  kiosk.position.y = 0.55;
  g.add(kiosk);

  // sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.35, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2a3cff, emissive: 0x2a3cff, emissiveIntensity: 0.55, roughness: 0.4 })
  );
  sign.position.set(0, 1.35, 0.55);
  g.add(sign);

  // item pedestals
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x0e1018, roughness: 0.9 });
  const iconMatFallback = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

  for (let i = 0; i < ShopCatalog.length; i++) {
    const item = ShopCatalog[i];
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 20), pedMat);
    ped.position.set(-0.75 + i * 0.5, 0.125, -0.55);
    g.add(ped);

    const iconTex = await kit.load(item.icon).catch(() => null);
    const iconMat = iconTex
      ? new THREE.MeshStandardMaterial({ map: iconTex, transparent: true, roughness: 0.9 })
      : iconMatFallback;

    const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), iconMat);
    icon.position.set(ped.position.x, 0.55, ped.position.z);
    icon.rotation.y = Math.PI;
    icon.userData.spin = 0.6 + Math.random() * 0.4;
    icon.userData.itemId = item.id;
    g.add(icon);
  }

  // store tick (spin icons)
  return {
    group: g,
    tick(dt) {
      for (const child of g.children) {
        if (child.isMesh && child.geometry?.type === "PlaneGeometry" && child.userData?.spin) {
          child.rotation.y += dt * child.userData.spin;
        }
      }
    }
  };
}
