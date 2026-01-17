// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_7_NAV_LASER_TELEPORT_SNAP
// - Bright world (no black void)
// - Big floor + grid for orientation
// - Clear table landmark
// - Right-hand laser + floor reticle
// - Teleport: right trigger OR right grip
// - Snap turn: 45° on right stick X
// - Smooth move: forward/back + strafe on right stick
// - Left controller optional support if it reports

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera, engine }) {
  const log = (s) => {
    try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {}
    console.log("[world]", s);
  };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_7_NAV_LASER_TELEPORT_SNAP");

  // =========================
  // LIGHTING
  // =========================
  scene.background = new THREE.Color(0x0b0e14);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 1.2);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(4, 8, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-4, 3, -4);
  scene.add(fill);

  // =========================
  // FLOOR + GRID
  // =========================
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f2b, roughness: 1, metalness: 0
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "SCARLETT_FLOOR";
  floor.receiveShadow = false;
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, 0x3a3f55, 0x23283a);
  grid.position.y = 0.01;
  scene.add(grid);

  // =========================
  // TABLE (LANDMARK)
  // =========================
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.15, 48),
    new THREE.MeshStandardMaterial({ color: 0x145a32, roughness: 0.85 })
  );
  table.position.set(0, 0.78, -1.5);
  table.name = "POKER_TABLE";
  scene.add(table);

  const tableRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.03, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0xc9a23f, roughness: 0.6 })
  );
  tableRing.rotation.x = Math.PI / 2;
  tableRing.position.set(0, 0.86, -1.5);
  scene.add(tableRing);

  // =========================
  // RIG (MOVE THIS, NOT CAMERA)
  // =========================
  const rig = new THREE.Group();
  rig.position.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  // =========================
  // GESTURE ALIGNMENT
  // =========================
  GestureControl.tableHeight = table.position.y;
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.GestureControl = GestureControl;
  log(`GestureControl ✅ tableHeight=${GestureControl.tableHeight.toFixed(3)}`);

  // =========================
  // XR CONTROLLERS (for laser origin)
  // =========================
  const rightCtrl = renderer.xr.getController(1);
  const leftCtrl  = renderer.xr.getController(0);
  rightCtrl.name = "XR_CONTROLLER_RIGHT";
  leftCtrl.name = "XR_CONTROLLER_LEFT";
  scene.add(rightCtrl);
  scene.add(leftCtrl);

  // =========================
  // LASER + RETICLE
  // =========================
  const raycaster = new THREE.Raycaster();
  const tmpOrigin = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpHit = new THREE.Vector3();

  // Laser line
  const laserGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0xff3355 });
  const laserLine = new THREE.Line(laserGeom, laserMat);
  laserLine.name = "RIGHT_LASER";
  laserLine.visible = true;
  rightCtrl.add(laserLine);

  // Reticle ring on floor
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.085, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.position.set(0, 0.02, -2);
  reticle.visible = false;
  reticle.name = "TELEPORT_RETICLE";
  scene.add(reticle);

  function updateLaserAndReticle() {
    if (!renderer.xr.isPresenting) {
      reticle.visible = false;
      laserLine.visible = false;
      return { hit: false };
    }

    laserLine.visible = true;

    rightCtrl.getWorldPosition(tmpOrigin);
    rightCtrl.getWorldDirection(tmpDir);

    // Force direction out the "front" of controller (better than getWorldDirection sometimes)
    // Use -Z of controller space:
    tmpDir.set(0, 0, -1).applyQuaternion(rightCtrl.quaternion).normalize();

    raycaster.set(tmpOrigin, tmpDir);

    const hits = raycaster.intersectObject(floor, false);
    if (hits && hits.length) {
      tmpHit.copy(hits[0].point);
      reticle.position.set(tmpHit.x, 0.02, tmpHit.z);
      reticle.visible = true;

      // Scale laser to hit distance
      const dist = tmpOrigin.distanceTo(tmpHit);
      const arr = laserLine.geometry.attributes.position.array;
      arr[0] = 0; arr[1] = 0; arr[2] = 0;
      arr[3] = 0; arr[4] = 0; arr[5] = -dist;
      laserLine.geometry.attributes.position.needsUpdate = true;

      return { hit: true, point: tmpHit.clone() };
    } else {
      reticle.visible = false;
      return { hit: false };
    }
  }

  // =========================
  // INPUT HELPERS
  // =========================
  const move = {
    speed: 2.1,       // m/s
    strafe: 1.8,      // m/s
    deadzone: 0.18,
  };

  const snap = {
    angle: THREE.MathUtils.degToRad(45),
    lock: false,
    release: 0.25,
  };

  const teleport = {
    lock: false,
    release: 0.15,
  };

  function getRightGamepad(session) {
    if (!session) return null;
    for (const src of session.inputSources) {
      if (src?.handedness === "right" && src?.gamepad) return src.gamepad;
    }
    // fallback: any gamepad
    for (const src of session.inputSources) {
      if (src?.gamepad) return src.gamepad;
    }
    return null;
  }

  function applySnapTurn(axX) {
    if (Math.abs(axX) < 0.6) {
      snap.lock = false;
      return;
    }
    if (snap.lock) return;

    snap.lock = true;

    // axX > 0 => turn right, axX < 0 => turn left
    const dir = axX > 0 ? -1 : 1;
    rig.rotation.y += dir * snap.angle;

    setTimeout(() => (snap.lock = false), snap.release * 1000);
  }

  function doTeleport(hitPoint) {
    if (!hitPoint) return;
    // move rig so camera ends up above hit point (keep current head height)
    const headWorld = new THREE.Vector3();
    camera.getWorldPosition(headWorld);

    // current head offset within rig
    const rigWorld = new THREE.Vector3();
    rig.getWorldPosition(rigWorld);
    const offset = headWorld.sub(rigWorld);

    rig.position.set(hitPoint.x - offset.x, rig.position.y, hitPoint.z - offset.z);
  }

  // =========================
  // UPDATE LOOP
  // =========================
  return {
    tableHeight: table.position.y,
    rig,
    update(dt) {
      const session = renderer.xr.getSession?.();
      if (!session) return;

      // Laser / reticle every frame
      const hit = updateLaserAndReticle();

      // Right controller gamepad
      const gp = getRightGamepad(session);
      if (!gp) return;

      // Axes (Quest typically: axes[2]=x, axes[3]=y on right stick)
      const axX = gp.axes?.[2] ?? 0;
      const axY = gp.axes?.[3] ?? 0;

      // Buttons: attempt to map trigger/grip
      const trigger = gp.buttons?.[0]?.value ?? 0; // common
      const gripBtn = gp.buttons?.[1]?.value ?? 0; // common

      // Snap turn on stick X (45-degree)
      if (Math.abs(axX) > 0.6) applySnapTurn(axX);

      // Smooth move: forward/back + strafe
      const y = Math.abs(axY) > move.deadzone ? axY : 0;
      const x = Math.abs(axX) > move.deadzone ? axX : 0;

      // Forward direction (flat)
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();

      // Right direction (flat)
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      // Move: forward/back (invert y so forward is negative axis)
      rig.position.addScaledVector(fwd, (-y) * move.speed * dt);
      // Strafe
      rig.position.addScaledVector(right, (x) * move.strafe * dt);

      // Teleport on trigger OR grip (press past threshold)
      const wantsTeleport = (trigger > 0.75) || (gripBtn > 0.75);

      if (!wantsTeleport) teleport.lock = false;

      if (wantsTeleport && !teleport.lock && hit.hit) {
        teleport.lock = true;
        doTeleport(hit.point);
        setTimeout(() => (teleport.lock = false), teleport.release * 1000);
      }
    }
  };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;
