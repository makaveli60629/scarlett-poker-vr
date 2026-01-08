// /js/rig_controls.js — Scarlett Core Rig 9.2 (PERMANENT)
// Owns: player rig, controllers/grips, laser pointer, locomotion, teleport arc.
// This file is designed to stay stable while world/gameplay evolves.

import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

export function createRigCore({ THREE, renderer, scene, camera, log }) {
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const head = new THREE.Group();
  head.name = "Head";
  head.add(camera);
  player.add(head);
  scene.add(player);

  let c0 = null, c1 = null;
  let g0 = null, g1 = null;

  // movement
  const MOVE_SPEED = 2.25;
  const TURN_ANGLE = THREE.MathUtils.degToRad(45);
  const DEADZONE = 0.20;
  let snapArmed = true;

  // Invert move toggle (fixes "back is forward")
  let invertMove = true; // default for most Quest mappings
  window.addEventListener("scarlett-toggle-invert-move", () => {
    invertMove = !invertMove;
    log(`[rig] invertMove = ${invertMove ? "ON" : "OFF"}`);
  });

  // teleport visuals
  const teleport = createTeleportSystem(THREE);
  scene.add(teleport.arcLine, teleport.ring);

  // laser pointer
  const rightPointer = buildLaserPointer(THREE);

  function getHeadYaw() {
    const q = new THREE.Quaternion();
    camera.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    return e.y;
  }

  function getGamepad(controller) {
    const src = controller?.userData?.inputSource;
    return src && src.gamepad ? src.gamepad : null;
  }

  function findControllerByHand(hand) {
    const a = c0?.userData?.inputSource?.handedness === hand ? c0 : null;
    const b = c1?.userData?.inputSource?.handedness === hand ? c1 : null;
    return a || b || null;
  }

  function findGripForController(controller) {
    if (controller === c0) return g0;
    if (controller === c1) return g1;
    return null;
  }

  function isRightHand(controller) {
    const src = controller?.userData?.inputSource;
    if (!src) return controller === c1;
    return src.handedness ? src.handedness === "right" : controller === c1;
  }

  function dead(v) {
    return Math.abs(v) > DEADZONE ? v : 0;
  }

  function setupControllers() {
    c0 = renderer.xr.getController(0);
    c1 = renderer.xr.getController(1);
    g0 = renderer.xr.getControllerGrip(0);
    g1 = renderer.xr.getControllerGrip(1);

    // ✅ IMPORTANT: parent controllers/grips to the rig
    player.add(c0, c1, g0, g1);

    const modelFactory = new XRControllerModelFactory();
    g0.add(modelFactory.createControllerModel(g0));
    g1.add(modelFactory.createControllerModel(g1));

    c0.addEventListener("connected", (e) => (c0.userData.inputSource = e.data));
    c1.addEventListener("connected", (e) => (c1.userData.inputSource = e.data));
    c0.addEventListener("disconnected", () => (c0.userData.inputSource = null));
    c1.addEventListener("disconnected", () => (c1.userData.inputSource = null));

    // teleport events (right hand)
    c0.addEventListener("selectstart", () => onSelectStart(c0));
    c1.addEventListener("selectstart", () => onSelectStart(c1));
    c0.addEventListener("selectend", () => onSelectEnd(c0));
    c1.addEventListener("selectend", () => onSelectEnd(c1));

    // attach pointer to right grip when known
    const attachPointer = () => {
      const rightCtrl = findControllerByHand("right") || c1;
      const rightGrip = findGripForController(rightCtrl) || g1 || g0 || rightCtrl;
      if (rightPointer.group.parent) rightPointer.group.parent.remove(rightPointer.group);
      rightGrip.add(rightPointer.group);
    };
    c0.addEventListener("connected", attachPointer);
    c1.addEventListener("connected", attachPointer);
    attachPointer();

    log("[rig] controllers ready ✅");
  }

  function onSelectStart(controller) {
    if (!isRightHand(controller)) return;
    teleport.active = true;
    teleport.controller = controller;
    teleport.sourceObj = findGripForController(controller) || controller;
  }

  function onSelectEnd(controller) {
    if (!isRightHand(controller)) return;
    // world decides what happens on "teleport confirm" (floor teleport or teleporter UI)
    teleport.justReleased = true;
    teleport.active = false;
    teleport.controller = null;
    teleport.sourceObj = null;
  }

  function applyLocomotion(dt, world) {
    const left = findControllerByHand("left") || c0;
    const right = findControllerByHand("right") || c1;

    // left stick move
    const gpL = getGamepad(left);
    if (gpL?.axes?.length >= 2) {
      const x = gpL.axes[2] ?? gpL.axes[0];
      const y = gpL.axes[3] ?? gpL.axes[1];

      const ax = dead(x);
      const ay = dead(y);

      if (ax || ay) {
        const yaw = getHeadYaw();
        const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const rightv = new THREE.Vector3(forward.z, 0, -forward.x);

        // ✅ Final: handle both mappings:
        // - Quest common: forward stick gives NEG y → use (-ay)
        // - Some mappings: forward gives POS y → use (+ay)
        // invertMove toggles this.
        const f = invertMove ? (-ay) : (ay);

        const move = new THREE.Vector3();
        move.addScaledVector(forward, f * MOVE_SPEED * dt);
        move.addScaledVector(rightv, ax * MOVE_SPEED * dt);

        player.position.add(move);

        if (world?.roomClamp) {
          player.position.x = THREE.MathUtils.clamp(player.position.x, world.roomClamp.minX, world.roomClamp.maxX);
          player.position.z = THREE.MathUtils.clamp(player.position.z, world.roomClamp.minZ, world.roomClamp.maxZ);
        }
      }
    }

    // right stick snap turn
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

    // pointer always updates
    updateLaserPointer(THREE, rightPointer, teleport, world, camera, g1, c1);

    // teleport arc while holding
    if (teleport.active) {
      const src = teleport.sourceObj || (findControllerByHand("right") || c1) || camera;
      updateTeleportArc(THREE, src, teleport, world, camera);
    } else {
      teleport.arcLine.visible = false;
      teleport.ring.visible = false;
    }
  }

  return {
    player,
    head,
    teleport,
    rightPointer,
    setupControllers,
    applyLocomotion,
    setInvertMove(v) { invertMove = !!v; },
    getInvertMove() { return invertMove; }
  };
}

// ---------- Pointer ----------
function buildLaserPointer(THREE) {
  const group = new THREE.Group();
  group.name = "RightLaserPointer";

  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 6;
  group.add(line);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x33ff66 })
  );
  dot.position.set(0, 0, -6);
  group.add(dot);

  group.rotation.x = -0.10;
  return { group, line, dot, hit: new THREE.Vector3(), hitObject: null };
}

function updateLaserPointer(THREE, pointer, tp, world, cam, g1, c1) {
  if (!pointer) return;

  const src = (g1 || c1 || cam);

  const origin = new THREE.Vector3();
  const q = new THREE.Quaternion();
  src.getWorldPosition(origin);
  src.getWorldQuaternion(q);

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

  // intersect with floor y=0
  const t = (0.03 - origin.y) / (dir.y || -0.0001);
  const hit = origin.clone().addScaledVector(dir, Math.max(0.1, Math.min(12.0, t)));

  if (world?.roomClamp) {
    hit.x = THREE.MathUtils.clamp(hit.x, world.roomClamp.minX, world.roomClamp.maxX);
    hit.z = THREE.MathUtils.clamp(hit.z, world.roomClamp.minZ, world.roomClamp.maxZ);
  }

  pointer.hit.copy(hit);
  pointer.dot.position.copy(pointer.group.worldToLocal(hit.clone()));

  const dist = origin.distanceTo(hit);
  pointer.line.scale.z = Math.max(0.3, dist);
}

// ---------- Teleport Visuals ----------
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

  return { active: false, valid: false, hitPoint: null, arcLine, ring, justReleased: false, sourceObj: null };
}

function updateTeleportArc(THREE, sourceObj, tp, world, cam) {
  tp.arcLine.visible = true;

  const origin = new THREE.Vector3();
  const q = new THREE.Quaternion();

  sourceObj?.getWorldPosition?.(origin);
  sourceObj?.getWorldQuaternion?.(q);

  const poseLooksBad = !isFinite(origin.x) || !isFinite(origin.y) || !isFinite(origin.z) || origin.length() < 0.001;
  if (poseLooksBad) {
    cam.getWorldPosition(origin);
    cam.getWorldQuaternion(q);
  }

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

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
