// /js/vrcontroller.js — Scarlett Poker VR — VRRig (controllers + laser + ring + teleport)
// Grip-based teleport: hold grip = aim, release grip = teleport

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

export function createVRRig(renderer, scene, camera, opts = {}) {
  const state = {
    heightLockM: opts.heightLockM ?? 1.8,
    swapMoveXFn: opts.swapMoveX ?? (() => false),
    getWorld: opts.getWorld ?? (() => null),

    // active controller for aiming
    activeController: null,
    activeGrip: null,

    // input caches
    leftAxes: [0, 0],
    rightAxes: [0, 0],
    lastSnapT: 0,

    // teleport
    aiming: false,
    aimHit: null,
  };

  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const up = new THREE.Vector3(0,1,0);

  // Controller models
  const modelFactory = new XRControllerModelFactory();

  // Controllers
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  c0.userData.index = 0;
  c1.userData.index = 1;
  scene.add(c0, c1);

  const g0 = renderer.xr.getControllerGrip(0);
  const g1 = renderer.xr.getControllerGrip(1);
  g0.add(modelFactory.createControllerModel(g0));
  g1.add(modelFactory.createControllerModel(g1));
  scene.add(g0, g1);

  // Fallback visible “wand” if model doesn’t show up
  const wandGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.16, 10);
  const wandMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.2 });
  const wand0 = new THREE.Mesh(wandGeo, wandMat);
  const wand1 = new THREE.Mesh(wandGeo, wandMat);
  wand0.rotation.x = -Math.PI / 2;
  wand1.rotation.x = -Math.PI / 2;
  c0.add(wand0);
  c1.add(wand1);

  // Laser line (green)
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
  const laserGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -8),
  ]);
  const laserLine0 = new THREE.Line(laserGeom, laserMat);
  const laserLine1 = new THREE.Line(laserGeom, laserMat);
  laserLine0.visible = false;
  laserLine1.visible = false;
  c0.add(laserLine0);
  c1.add(laserLine1);

  // Floor ring (destination)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.03, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.25 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // Controller events
  function onSelectStart(e) {
    // trigger start - not used for teleport here (we use grip), but can be extended
  }
  function onSelectEnd(e) {}

  function onSqueezeStart(e) {
    // GRIP pressed => aim + show laser + ring
    state.aiming = true;
    setActiveFromEvent(e);
    setLaserVisible(true);
  }
  function onSqueezeEnd(e) {
    // GRIP released => teleport if valid
    setActiveFromEvent(e);
    if (state.aimHit) {
      teleportTo(state.aimHit.point);
    }
    state.aiming = false;
    state.aimHit = null;
    ring.visible = false;
    setLaserVisible(false);
  }

  c0.addEventListener("selectstart", onSelectStart);
  c0.addEventListener("selectend", onSelectEnd);
  c0.addEventListener("squeezestart", onSqueezeStart);
  c0.addEventListener("squeezeend", onSqueezeEnd);

  c1.addEventListener("selectstart", onSelectStart);
  c1.addEventListener("selectend", onSelectEnd);
  c1.addEventListener("squeezestart", onSqueezeStart);
  c1.addEventListener("squeezeend", onSqueezeEnd);

  function setActiveFromEvent(e) {
    // e.target is controller
    const ctrl = e?.target;
    if (!ctrl) return;
    state.activeController = ctrl;
    state.activeGrip = (ctrl.userData.index === 0) ? g0 : g1;
  }

  function setLaserVisible(v) {
    laserLine0.visible = v && (state.activeController === c0);
    laserLine1.visible = v && (state.activeController === c1);
    if (!v) {
      laserLine0.visible = false;
      laserLine1.visible = false;
    }
  }

  // Movement (XR)
  function applyXRLocomotion(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    // Find gamepads
    const sources = session.inputSources || [];
    let left = null, right = null;
    for (const s of sources) {
      if (!s?.gamepad) continue;
      const handed = s.handedness;
      if (handed === "left") left = s.gamepad;
      if (handed === "right") right = s.gamepad;
    }

    // Axes mapping
    const la = left?.axes?.length >= 2 ? left.axes : [0,0];
    const ra = right?.axes?.length >= 2 ? right.axes : [0,0];

    // Many Quest controllers: axes[2]/[3] exist; but safest is take first pair
    const lx = la[0] ?? 0;
    const ly = la[1] ?? 0;
    const rx = ra[0] ?? 0;

    // Move (left stick)
    const swapX = !!state.swapMoveXFn();
    const mx = swapX ? -lx : lx;
    const mz = ly;

    const dead = 0.14;
    const mv = new THREE.Vector3(
      Math.abs(mx) < dead ? 0 : mx,
      0,
      Math.abs(mz) < dead ? 0 : mz
    );

    if (mv.lengthSq() > 0.0001) {
      mv.normalize();
      // forward is -Z
      const speed = 2.0;
      // Convert controller space -> world yaw (camera yaw)
      const yaw = getCameraYaw();
      const move = new THREE.Vector3(mv.x, 0, mv.z).multiplyScalar(speed * dt);
      move.applyAxisAngle(up, yaw);
      attemptMove(move);
    }

    // Snap turn (right stick X)
    const snapDead = 0.45;
    if (Math.abs(rx) > snapDead) {
      const now = performance.now() / 1000;
      if (now - state.lastSnapT > 0.28) {
        const amt = (rx > 0 ? -1 : 1) * (Math.PI / 4); // 45°
        rotatePlayer(amt);
        state.lastSnapT = now;
      }
    }
  }

  function getCameraYaw() {
    // camera world direction projected on XZ
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    return Math.atan2(fwd.x, fwd.z);
  }

  function rotatePlayer(rad) {
    // rotate around camera position to keep you anchored
    const p = camera.getWorldPosition(new THREE.Vector3());
    // scene root is external; we rotate by manipulating parent of camera? Here camera is in playerGroup in main.
    // So rotate camera.parent (playerGroup)
    const root = camera.parent;
    if (!root) return;
    root.rotation.y += rad;
    // keep height lock
    lockHeight();
  }

  function lockHeight() {
    // Force camera local Y by shifting parent if needed
    // (We keep height by using camera local Y)
    camera.position.y = state.heightLockM;
  }

  function attemptMove(delta) {
    const root = camera.parent;
    if (!root) return;

    const world = state.getWorld();
    const b = world?.bounds;

    const next = root.position.clone().add(delta);

    if (b) {
      next.x = THREE.MathUtils.clamp(next.x, b.min.x, b.max.x);
      next.z = THREE.MathUtils.clamp(next.z, b.min.z, b.max.z);
    }

    // keep-out around table
    const keepOut = new THREE.Box3(
      new THREE.Vector3(-3.2, 0, -3.2),
      new THREE.Vector3( 3.2, 3,  3.2)
    );
    if (keepOut.containsPoint(next)) return;

    root.position.copy(next);
  }

  function teleportTo(point) {
    const root = camera.parent;
    if (!root) return;

    const world = state.getWorld();
    const b = world?.bounds;

    const next = new THREE.Vector3(point.x, 0, point.z);
    if (b) {
      next.x = THREE.MathUtils.clamp(next.x, b.min.x, b.max.x);
      next.z = THREE.MathUtils.clamp(next.z, b.min.z, b.max.z);
    }

    // don’t teleport inside table box
    const keepOut = new THREE.Box3(
      new THREE.Vector3(-3.2, 0, -3.2),
      new THREE.Vector3( 3.2, 3,  3.2)
    );
    if (keepOut.containsPoint(next)) return;

    root.position.set(next.x, 0, next.z);
    lockHeight();
  }

  function updateAim() {
    if (!state.aiming || !state.activeController) return;

    // Build ray from controller forward (-Z)
    tmpMat.identity().extractRotation(state.activeController.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
    tmpPos.setFromMatrixPosition(state.activeController.matrixWorld);

    raycaster.set(tmpPos, tmpDir);

    // Only hit the floor (world marks it as isFloor)
    const world = state.getWorld();
    const floor = scene.children.find(o => o?.userData?.isFloor);
    if (!floor) {
      // fallback: intersect any mesh
      const hits = raycaster.intersectObjects(scene.children, true);
      state.aimHit = hits[0] || null;
    } else {
      const hits = raycaster.intersectObject(floor, true);
      state.aimHit = hits[0] || null;
    }

    if (state.aimHit) {
      ring.position.set(state.aimHit.point.x, (world?.floorY ?? 0) + 0.03, state.aimHit.point.z);
      ring.visible = true;
    } else {
      ring.visible = false;
    }
  }

  function update(dt) {
    // Always keep height locked
    lockHeight();

    if (renderer.xr.isPresenting) {
      // Make sure laser visibility matches the active controller while aiming
      setLaserVisible(state.aiming);

      // XR locomotion
      applyXRLocomotion(dt);

      // Aim update
      updateAim();
    } else {
      // Non-XR: hide VR-only visuals
      laserLine0.visible = false;
      laserLine1.visible = false;
      ring.visible = false;
    }
  }

  function setHeightLock(m) {
    state.heightLockM = m;
    lockHeight();
  }

  return {
    update,
    setHeightLock,
  };
}
