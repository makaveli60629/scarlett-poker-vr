// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_9_RIGGED_LASER_TABLE_KNOCK_LOBBY
// - Laser rigged to right-hand GRIP (never detaches)
// - Teleport only on valid reticle hit
// - Knock sound ONLY when right hand is over table
// - Visible right-hand box
// - Walkable lobby shell (orientation + scale reference)

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera, engine }) {
  const log = (s) => {
    try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {}
    console.log("[world]", s);
  };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_9_RIGGED_LASER_TABLE_KNOCK_LOBBY");

  /* =========================================================
   * LIGHTING
   * ========================================================= */
  scene.background = new THREE.Color(0x0b0e14);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x303050, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  /* =========================================================
   * RIG (MOVE THIS, NOT CAMERA)
   * ========================================================= */
  const rig = new THREE.Group();
  rig.name = "PLAYER_RIG";
  rig.add(camera);
  scene.add(rig);

  /* =========================================================
   * FLOOR + GRID
   * ========================================================= */
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

  /* =========================================================
   * LOBBY SHELL (WALKABLE ORIENTATION SPACE)
   * ========================================================= */
  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 8, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0f1420,
      roughness: 0.9,
      side: THREE.DoubleSide
    })
  );
  lobbyWall.position.y = 4;
  scene.add(lobbyWall);

  const lobbyRing = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.05, 16, 128),
    new THREE.MeshStandardMaterial({ color: 0x394060, roughness: 0.6 })
  );
  lobbyRing.rotation.x = Math.PI / 2;
  lobbyRing.position.y = 0.02;
  scene.add(lobbyRing);

  /* =========================================================
   * TABLE (LANDMARK + KNOCK TARGET)
   * ========================================================= */
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

  /* =========================================================
   * GESTURE CONTROL SETUP
   * ========================================================= */
  GestureControl.tableHeight = table.position.y;
  GestureControl.tableCenter = { x: table.position.x, z: table.position.z };
  GestureControl.tableRadius = 1.35;

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.GestureControl = GestureControl;

  log("GestureControl ✅ table-bound knock enabled");

  /* =========================================================
   * XR CONTROLLERS (GRIPS = STAY ATTACHED)
   * ========================================================= */
  const rightRay  = renderer.xr.getController(1);
  const leftRay   = renderer.xr.getController(0);
  scene.add(rightRay, leftRay);

  const rightGrip = renderer.xr.getControllerGrip(1);
  const leftGrip  = renderer.xr.getControllerGrip(0);
  scene.add(rightGrip, leftGrip);

  /* =========================================================
   * RIGHT HAND VISUAL (BOX)
   * ========================================================= */
  const handBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.10),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  handBox.position.set(0, -0.02, -0.05);
  rightGrip.add(handBox);

  /* =========================================================
   * LASER + RETICLE
   * ========================================================= */
  const raycaster = new THREE.Raycaster();
  const tmpO = new THREE.Vector3();
  const tmpD = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpHit = new THREE.Vector3();

  const laserGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -6)
  ]);
  const laser = new THREE.Line(
    laserGeom,
    new THREE.LineBasicMaterial({ color: 0xff3355 })
  );
  rightGrip.add(laser);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.085, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  function setLaserLength(d) {
    const a = laser.geometry.attributes.position.array;
    a[5] = -d;
    laser.geometry.attributes.position.needsUpdate = true;
  }

  function updateLaser() {
    if (!renderer.xr.isPresenting) {
      reticle.visible = false;
      return null;
    }

    rightGrip.getWorldPosition(tmpO);
    rightGrip.getWorldQuaternion(tmpQ);
    tmpD.set(0, 0, -1).applyQuaternion(tmpQ).normalize();

    raycaster.set(tmpO, tmpD);
    raycaster.far = 60;

    const hits = raycaster.intersectObject(floor, false);
    if (hits.length) {
      tmpHit.copy(hits[0].point);
      reticle.position.set(tmpHit.x, 0.02, tmpHit.z);
      reticle.visible = true;
      setLaserLength(tmpO.distanceTo(tmpHit));
      return tmpHit.clone();
    }

    reticle.visible = false;
    setLaserLength(6);
    return null;
  }

  /* =========================================================
   * NAVIGATION
   * ========================================================= */
  const move = { speed: 2.2, strafe: 2.0, deadzone: 0.18 };
  const snap = { lock: false };

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

  /* =========================================================
   * UPDATE LOOP
   * ========================================================= */
  return {
    rig,
    tableHeight: table.position.y,
    update(dt) {
      const session = renderer.xr.getSession?.();
      if (!session) return;

      const hitPoint = updateLaser();
      const gp = getRightGamepad(session);
      if (!gp) return;

      const axX = gp.axes[2] ?? 0;
      const axY = gp.axes[3] ?? 0;
      const trigger = gp.buttons[0]?.value ?? 0;
      const gripBtn = gp.buttons[1]?.value ?? 0;

      // snap turn
      if (Math.abs(axX) > 0.6 && !snap.lock) snapTurn(axX);

      // smooth move
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();

      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0));
      rig.position.addScaledVector(fwd, -axY * move.speed * dt);
      rig.position.addScaledVector(right, axX * move.strafe * dt);

      // teleport
      if ((trigger > 0.75 || gripBtn > 0.75) && hitPoint) teleportTo(hitPoint);

      // knock gesture (right hand only)
      rightGrip.getWorldPosition(tmpO);
      const vY = rightGrip.position.y - (this._lastY ?? rightGrip.position.y);
      this._lastY = rightGrip.position.y;

      GestureControl.update({
        handedness: "right",
        position: { x: tmpO.x, y: tmpO.y, z: tmpO.z },
        velocity: { x: 0, y: vY / Math.max(dt, 0.016), z: 0 }
      });
    }
  };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;
