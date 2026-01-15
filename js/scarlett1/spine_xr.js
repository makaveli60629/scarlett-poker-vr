// /js/scarlett1/spine_xr.js — XR Controls (FULL • SAFE)
// - Only active while renderer.xr.isPresenting
// - Right stick: move forward/back (camera-relative), snap turn 45°
// - Trigger: teleport ray to floor/colliders
// - Adds a visible reticle + "rainbow-ish" arc line

export async function init({ THREE, scene, camera, renderer, playerRig, colliders, addUpdater, log }) {
  const diag = log || console.log;

  if (!renderer?.xr) return;

  // Helpers
  const tmpV = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  // Controller + laser
  const c0 = renderer.xr.getController(0);
  c0.name = "RightController";
  playerRig.add(c0);

  const c1 = renderer.xr.getController(1);
  c1.name = "LeftController";
  playerRig.add(c1);

  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x66aaff });
  const laser = new THREE.Line(laserGeom, laserMat);
  laser.scale.z = 12;
  c0.add(laser);

  // Arc (multi-segment line)
  const arcPts = [];
  for (let i=0;i<24;i++) arcPts.push(new THREE.Vector3(0,0,0));
  const arcGeom = new THREE.BufferGeometry().setFromPoints(arcPts);
  const arcMat = new THREE.LineBasicMaterial({ color: 0xaad9ff, transparent:true, opacity:0.9 });
  const arcLine = new THREE.Line(arcGeom, arcMat);
  scene.add(arcLine);
  arcLine.visible = false;

  // Reticle
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.10, 0.16, 28),
    new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent:true, opacity:0.9 })
  );
  reticle.rotation.x = -Math.PI/2;
  reticle.visible = false;
  scene.add(reticle);

  // Snap-turn
  let snapCooldown = 0;
  const SNAP = THREE.MathUtils.degToRad(45);

  // Movement state
  const move = { fwd: 0, turn: 0 };
  const speed = 1.8;

  function getHeadYaw() {
    // Use camera world direction projected on XZ for camera-relative movement
    camera.getWorldDirection(tmpDir);
    tmpDir.y = 0;
    tmpDir.normalize();
    const yaw = Math.atan2(tmpDir.x, tmpDir.z);
    return yaw;
  }

  // Teleport state
  let teleActive = false;
  let teleHit = null;

  function intersectFromController() {
    // Ray from controller forward
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0,0,-1);

    c0.getWorldPosition(origin);
    dir.applyQuaternion(c0.getWorldQuaternion(new THREE.Quaternion())).normalize();

    raycaster.set(origin, dir);
    raycaster.far = 20;

    const hits = raycaster.intersectObjects(colliders || [], true);
    return hits && hits.length ? hits[0] : null;
  }

  function updateTeleportViz(hit) {
    if (!hit) {
      arcLine.visible = false;
      reticle.visible = false;
      return;
    }
    // Simple arc approximation (visual only)
    const p0 = new THREE.Vector3();
    c0.getWorldPosition(p0);

    const p1 = hit.point.clone();
    const mid = p0.clone().lerp(p1, 0.5);
    mid.y += 1.2;

    const pts = [];
    const N = 24;
    for (let i=0;i<N;i++) {
      const t = i/(N-1);
      // quadratic bezier
      const a = p0.clone().multiplyScalar((1-t)*(1-t));
      const b = mid.clone().multiplyScalar(2*(1-t)*t);
      const c = p1.clone().multiplyScalar(t*t);
      pts.push(a.add(b).add(c));
    }
    arcGeom.setFromPoints(pts);
    arcLine.visible = true;

    reticle.position.copy(hit.point);
    reticle.visible = true;
  }

  // Gamepad inputs
  function pollXRInputs(dt) {
    if (!renderer.xr.isPresenting) return;

    const session = renderer.xr.getSession();
    if (!session) return;

    const srcs = session.inputSources || [];
    let right = null;

    for (const s of srcs) {
      if (s?.handedness === "right") right = s;
    }

    move.fwd = 0;
    move.turn = 0;

    const gp = right?.gamepad;
    if (gp?.axes?.length >= 2) {
      // axes: [x, y] on most
      const axX = gp.axes[0] || 0;
      const axY = gp.axes[1] || 0;

      // forward/back on Y (camera-relative)
      move.fwd = -axY; // (up is -1)
      // snap turn on X
      move.turn = axX;
    }
  }

  // Events for teleport trigger
  c0.addEventListener("selectstart", () => {
    if (!renderer.xr.isPresenting) return;
    teleActive = true;
  });

  c0.addEventListener("selectend", () => {
    if (!renderer.xr.isPresenting) return;
    if (teleHit?.point) {
      // Teleport: move rig so camera lands on reticle point
      const headPos = new THREE.Vector3();
      camera.getWorldPosition(headPos);

      const offset = headPos.clone().sub(playerRig.position);
      offset.y = 0;

      playerRig.position.set(
        teleHit.point.x - offset.x,
        playerRig.position.y,
        teleHit.point.z - offset.z
      );
    }
    teleActive = false;
    teleHit = null;
    updateTeleportViz(null);
  });

  addUpdater((dt) => {
    // Only run XR control while presenting
    if (!renderer.xr.isPresenting) {
      arcLine.visible = false;
      reticle.visible = false;
      return;
    }

    pollXRInputs(dt);

    // snap turn
    snapCooldown = Math.max(0, snapCooldown - dt);
    if (snapCooldown <= 0) {
      if (move.turn > 0.7) { playerRig.rotation.y -= SNAP; snapCooldown = 0.22; }
      if (move.turn < -0.7){ playerRig.rotation.y += SNAP; snapCooldown = 0.22; }
    }

    // camera-relative forward movement
    if (Math.abs(move.fwd) > 0.08) {
      const yaw = getHeadYaw();
      const f = move.fwd * speed * dt;

      // forward in direction you LOOK
      playerRig.position.x += Math.sin(yaw) * f;
      playerRig.position.z += Math.cos(yaw) * f;
    }

    // teleport viz
    if (teleActive) {
      teleHit = intersectFromController();
      updateTeleportViz(teleHit);
    }
  });

  diag("[xr] ready ✅");
  }
