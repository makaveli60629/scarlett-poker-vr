// /js/vrcontroller.js — Scarlett Poker VR — VRRig (controllers + laser + ring + teleport)
// Grip-based teleport: hold grip = aim, release grip = teleport
// Upgrade: pads fast-travel (aim a pad -> release grip -> teleport to pad center)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

export function createVRRig(renderer, scene, camera, opts = {}) {
  const state = {
    heightLockM: opts.heightLockM ?? 1.8,
    swapMoveXFn: opts.swapMoveX ?? (() => false),
    getWorld: opts.getWorld ?? (() => null),

    activeController: null,
    activeGrip: null,

    lastSnapT: 0,

    aiming: false,
    aimHit: null, // { point, object, type, padId }
  };

  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

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

  // Fallback “wand” so you ALWAYS see something
  const wandGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.16, 10);
  const wandMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.2 });
  const wand0 = new THREE.Mesh(wandGeo, wandMat);
  const wand1 = new THREE.Mesh(wandGeo, wandMat);
  wand0.rotation.x = -Math.PI / 2;
  wand1.rotation.x = -Math.PI / 2;
  c0.add(wand0);
  c1.add(wand1);

  // Laser lines
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)]);
  const laserLine0 = new THREE.Line(laserGeom, laserMat);
  const laserLine1 = new THREE.Line(laserGeom, laserMat);
  laserLine0.visible = false;
  laserLine1.visible = false;
  c0.add(laserLine0);
  c1.add(laserLine1);

  // Destination ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.03, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.4 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // “Pad highlight ring” (bigger when you hover pads)
  const padRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.04, 10, 44),
    new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffd27a, emissiveIntensity: 1.1, transparent: true, opacity: 0.85 })
  );
  padRing.rotation.x = Math.PI / 2;
  padRing.visible = false;
  scene.add(padRing);

  function setActiveFromEvent(e) {
    const ctrl = e?.target;
    if (!ctrl) return;
    state.activeController = ctrl;
    state.activeGrip = (ctrl.userData.index === 0) ? g0 : g1;
  }

  function setLaserVisible(v) {
    laserLine0.visible = v && (state.activeController === c0);
    laserLine1.visible = v && (state.activeController === c1);
    if (!v) { laserLine0.visible = false; laserLine1.visible = false; }
  }

  function onSqueezeStart(e) {
    state.aiming = true;
    setActiveFromEvent(e);
    setLaserVisible(true);
  }

  function onSqueezeEnd(e) {
    setActiveFromEvent(e);

    if (state.aimHit) {
      if (state.aimHit.type === "pad" && state.aimHit.padId) {
        const world = state.getWorld();
        const pad = world?.padById?.[state.aimHit.padId];
        if (pad?.position) teleportTo(pad.position);
      } else {
        teleportTo(state.aimHit.point);
      }
    }

    state.aiming = false;
    state.aimHit = null;
    ring.visible = false;
    padRing.visible = false;
    setLaserVisible(false);
  }

  c0.addEventListener("squeezestart", onSqueezeStart);
  c0.addEventListener("squeezeend", onSqueezeEnd);
  c1.addEventListener("squeezestart", onSqueezeStart);
  c1.addEventListener("squeezeend", onSqueezeEnd);

  function lockHeight() {
    camera.position.y = state.heightLockM;
  }

  function getCameraYaw() {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    return Math.atan2(fwd.x, fwd.z);
  }

  function rotatePlayer(rad) {
    const root = camera.parent;
    if (!root) return;
    root.rotation.y += rad;
    lockHeight();
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

    // don’t teleport inside table
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

    // Ray from controller forward (-Z)
    tmpMat.identity().extractRotation(state.activeController.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
    tmpPos.setFromMatrixPosition(state.activeController.matrixWorld);
    raycaster.set(tmpPos, tmpDir);

    // Gather targets: pads (their objects) + floor
    const world = state.getWorld();
    const targets = [];

    if (world?.pads?.length) {
      for (const p of world.pads) {
        if (p?.object) targets.push(p.object);
      }
    }

    // Find floor flagged as isFloor
    let floor = null;
    for (const o of scene.children) {
      if (o?.userData?.isFloor) { floor = o; break; }
    }
    if (floor) targets.push(floor);

    // Raycast
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits?.length) {
      state.aimHit = null;
      ring.visible = false;
      padRing.visible = false;
      return;
    }

    const hit = hits[0];
    state.aimHit = { point: hit.point.clone(), object: hit.object, type: "floor", padId: null };

    // If hit pad object (walk up parents until we find userData.padId)
    let obj = hit.object;
    let padId = null;
    while (obj) {
      if (obj.userData?.padId) { padId = obj.userData.padId; break; }
      obj = obj.parent;
    }

    if (padId) {
      state.aimHit.type = "pad";
      state.aimHit.padId = padId;

      // Snap highlight to pad center
      const pad = world?.padById?.[padId];
      if (pad?.position) {
        padRing.position.set(pad.position.x, (world.floorY ?? 0) + 0.07, pad.position.z);
        padRing.visible = true;
      } else padRing.visible = false;

      ring.visible = false;
    } else {
      // Floor target
      ring.position.set(hit.point.x, (world?.floorY ?? 0) + 0.03, hit.point.z);
      ring.visible = true;
      padRing.visible = false;
    }
  }

  function applyXRLocomotion(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    let left = null, right = null;
    for (const s of session.inputSources || []) {
      if (!s?.gamepad) continue;
      if (s.handedness === "left") left = s.gamepad;
      if (s.handedness === "right") right = s.gamepad;
    }

    const la = left?.axes?.length >= 2 ? left.axes : [0,0];
    const ra = right?.axes?.length >= 2 ? right.axes : [0,0];

    const lx = la[0] ?? 0;
    const ly = la[1] ?? 0;
    const rx = ra[0] ?? 0;

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
      const speed = 2.0;
      const yaw = getCameraYaw();
      const move = new THREE.Vector3(mv.x, 0, mv.z).multiplyScalar(speed * dt);
      move.applyAxisAngle(up, yaw);
      attemptMove(move);
    }

    // Snap turn (45°)
    const snapDead = 0.45;
    if (Math.abs(rx) > snapDead) {
      const now = performance.now() / 1000;
      if (now - state.lastSnapT > 0.28) {
        const amt = (rx > 0 ? -1 : 1) * (Math.PI / 4);
        rotatePlayer(amt);
        state.lastSnapT = now;
      }
    }
  }

  function update(dt) {
    lockHeight();

    if (renderer.xr.isPresenting) {
      setLaserVisible(state.aiming);
      applyXRLocomotion(dt);
      updateAim();
    } else {
      laserLine0.visible = false;
      laserLine1.visible = false;
      ring.visible = false;
      padRing.visible = false;
    }
  }

  function setHeightLock(m) {
    state.heightLockM = m;
    lockHeight();
  }

  return { update, setHeightLock };
                        }
