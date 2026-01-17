// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_10_RIG_PARENTED_CONTROLLERS_RAY_AIM
// FIXES:
// - Controllers/laser now MOVE WITH YOU (parented under rig)
// - Laser aims correctly (uses targetRay space quaternion)
// - Reticle no longer “stuck at spawn”
// - Knock works again (uses rightGrip world pose, gated by table bounds)
// - Teleport uses valid hit only

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera }) {
  const log = (s) => {
    try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {}
    console.log("[world]", s);
  };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_10_RIG_PARENTED_CONTROLLERS_RAY_AIM");

  // -------------------------
  // LIGHTING
  // -------------------------
  scene.background = new THREE.Color(0x0b0e14);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303050, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  // -------------------------
  // RIG (MOVE THIS)
  // -------------------------
  const rig = new THREE.Group();
  rig.name = "PLAYER_RIG";
  scene.add(rig);

  // camera must be inside rig for locomotion
  rig.add(camera);

  // -------------------------
  // FLOOR + GRID
  // -------------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  scene.add(floor);

  const grid = new THREE.GridHelper(300, 300, 0x3a3f55, 0x23283a);
  grid.position.y = 0.01;
  scene.add(grid);

  // -------------------------
  // LOBBY SHELL
  // -------------------------
  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 8, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.9, side: THREE.DoubleSide })
  );
  lobbyWall.position.y = 4;
  scene.add(lobbyWall);

  // -------------------------
  // TABLE (LANDMARK)
  // -------------------------
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.15, 48),
    new THREE.MeshStandardMaterial({ color: 0x145a32, roughness: 0.85 })
  );
  table.position.set(0, 0.78, -2);
  table.name = "POKER_TABLE";
  scene.add(table);

  const tableRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.03, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0xc9a23f })
  );
  tableRing.rotation.x = Math.PI / 2;
  tableRing.position.set(0, 0.86, -2);
  scene.add(tableRing);

  // -------------------------
  // GestureControl (table-only knock)
  // -------------------------
  GestureControl.tableHeight = table.position.y;
  GestureControl.tableCenter = { x: table.position.x, z: table.position.z };
  GestureControl.tableRadius = 1.35;

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.GestureControl = GestureControl;

  // -------------------------
  // XR CONTROLLERS (IMPORTANT)
  // - rightRay = aiming direction (targetRay space)
  // - rightGrip = hand model space (follows controller pose)
  // BOTH are parented under rig so they move with teleport/smooth move
  // -------------------------
  const rightRay  = renderer.xr.getController(1);
  const leftRay   = renderer.xr.getController(0);
  const rightGrip = renderer.xr.getControllerGrip(1);
  const leftGrip  = renderer.xr.getControllerGrip(0);

  rightRay.name = "RIGHT_RAY";
  leftRay.name = "LEFT_RAY";
  rightGrip.name = "RIGHT_GRIP";
  leftGrip.name = "LEFT_GRIP";

  rig.add(rightRay, leftRay, rightGrip, leftGrip);

  // -------------------------
  // Right hand visual (box)
  // -------------------------
  const handBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.10),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  handBox.position.set(0, -0.02, -0.05);
  rightGrip.add(handBox);

  // -------------------------
  // LASER + RETICLE + HIT DOT
  // Laser is attached to RIGHT RAY (correct aim)
  // -------------------------
  const raycaster = new THREE.Raycaster();
  const tmpO = new THREE.Vector3();
  const tmpD = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpHit = new THREE.Vector3();

  const laserGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -6)
  ]);
  const laser = new THREE.Line(laserGeom, new THREE.LineBasicMaterial({ color: 0xff3355 }));
  laser.name = "RIGHT_LASER";
  rightRay.add(laser);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.085, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  const hitDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  hitDot.visible = false;
  scene.add(hitDot);

  function setLaserLength(d) {
    const a = laser.geometry.attributes.position.array;
    a[5] = -d;
    laser.geometry.attributes.position.needsUpdate = true;
  }

  function updateLaser() {
    if (!renderer.xr.isPresenting) {
      reticle.visible = false;
      hitDot.visible = false;
      laser.visible = false;
      return null;
    }

    laser.visible = true;

    rightRay.getWorldPosition(tmpO);
    rightRay.getWorldQuaternion(tmpQ);
    tmpD.set(0, 0, -1).applyQuaternion(tmpQ).normalize();

    raycaster.set(tmpO, tmpD);
    raycaster.far = 60;

    const hits = raycaster.intersectObject(floor, false);
    if (hits.length) {
      tmpHit.copy(hits[0].point);

      reticle.position.set(tmpHit.x, 0.02, tmpHit.z);
      reticle.visible = true;

      hitDot.position.set(tmpHit.x, 0.03, tmpHit.z);
      hitDot.visible = true;

      setLaserLength(tmpO.distanceTo(tmpHit));
      return tmpHit.clone();
    }

    reticle.visible = false;
    hitDot.visible = false;
    setLaserLength(6);
    return null;
  }

  // -------------------------
  // NAVIGATION (right stick)
  // -------------------------
  const move = { speed: 2.2, strafe: 2.0, deadzone: 0.18 };
  const snap = { lock: false };
  const tele = { lock: false };

  function getRightGamepad(session) {
    for (const src of session.inputSources) {
      if (src?.handedness === "right" && src?.gamepad) return src.gamepad;
    }
    return null;
  }

  function snapTurn(x) {
    if (snap.lock) return;
    snap.lock = true;
    rig.rotation.y += (x > 0 ? -1 : 1) * THREE.MathUtils.degToRad(45);
    setTimeout(() => (snap.lock = false), 250);
  }

  function teleportTo(p) {
    if (!p) return;

    const head = new THREE.Vector3();
    camera.getWorldPosition(head);

    rig.position.x += p.x - head.x;
    rig.position.z += p.z - head.z;
  }

  // knock velocity tracking
  const lastGripPos = new THREE.Vector3();
  let lastGripInit = false;

  return {
    rig,
    tableHeight: table.position.y,
    update(dt) {
      const session = renderer.xr.getSession?.();
      if (!session) return;

      const hitPoint = updateLaser();

      const gp = getRightGamepad(session);
      if (!gp) return;

      const axX = gp.axes?.[2] ?? 0;
      const axY = gp.axes?.[3] ?? 0;
      const trigger = gp.buttons?.[0]?.value ?? 0;
      const gripBtn = gp.buttons?.[1]?.value ?? 0;

      // snap turn (45)
      if (Math.abs(axX) > 0.6 && !snap.lock) snapTurn(axX);

      // smooth move + strafe
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      rig.position.addScaledVector(fwd, -axY * move.speed * dt);
      rig.position.addScaledVector(right, axX * move.strafe * dt);

      // teleport (only if hitPoint valid)
      const wantsTeleport = (trigger > 0.75) || (gripBtn > 0.75);
      if (!wantsTeleport) tele.lock = false;

      if (wantsTeleport && !tele.lock && hitPoint) {
        tele.lock = true;
        teleportTo(hitPoint);
        setTimeout(() => (tele.lock = false), 180);
      }

      // KNOCK (right hand only, table-gated inside GestureControl)
      const gripWorld = new THREE.Vector3();
      rightGrip.getWorldPosition(gripWorld);

      if (!lastGripInit) {
        lastGripPos.copy(gripWorld);
        lastGripInit = true;
        return;
      }

      const vy = (gripWorld.y - lastGripPos.y) / Math.max(dt, 0.016);
      lastGripPos.copy(gripWorld);

      GestureControl.update({
        handedness: "right",
        position: { x: gripWorld.x, y: gripWorld.y, z: gripWorld.z },
        velocity: { x: 0, y: vy, z: 0 }
      });
    }
  };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;
