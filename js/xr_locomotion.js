import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function makeXRLoco(renderer, camera, rigForUIOnly) {
  let baseRefSpace = null;
  let xrYaw = 0;
  const xrOffset = new THREE.Vector3(0, 0, 0);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 36),
    new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x004466, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.visible = false;

  // distance “radius” ring (shows your range)
  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 2.55, 48),
    new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x003311, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.visible = false;

  const raycaster = new THREE.Raycaster();
  const tmpMat4 = new THREE.Matrix4();
  const tmpOrigin = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  function setBaseRef() {
    baseRefSpace = renderer.xr.getReferenceSpace();
    applyOffset();
  }

  function applyOffset() {
    if (!baseRefSpace || !renderer.xr.getSession()) return;

    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), xrYaw);
    const rot = { x: q.x, y: q.y, z: q.z, w: q.w };
    const pos = { x: -xrOffset.x, y: 0, z: -xrOffset.z };
    const t = new XRRigidTransform(pos, rot);

    const offsetRef = baseRefSpace.getOffsetReferenceSpace(t);
    renderer.xr.setReferenceSpace(offsetRef);

    // also keep rig aligned for menu placement only
    if (rigForUIOnly) rigForUIOnly.position.set(xrOffset.x, 0, xrOffset.z);
  }

  function getRay(ctrl) {
    ctrl.updateMatrixWorld(true);
    tmpMat4.identity().extractRotation(ctrl.matrixWorld);
    tmpOrigin.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat4).normalize();
    return { origin: tmpOrigin.clone(), dir: tmpDir.clone() };
  }

  function hitFloor(origin, dir) {
    const t = (0 - origin.y) / dir.y;
    if (!isFinite(t) || t < 0) return null;
    return origin.clone().add(dir.clone().multiplyScalar(t));
  }

  function setSpawn(x, z, yawDeg = 0) {
    xrOffset.set(x, 0, z);
    xrYaw = THREE.MathUtils.degToRad(yawDeg);
    applyOffset();
  }

  // snap turn only (right stick)
  let snapCooldown = 0;
  function snapTurn(dt, session) {
    if (!session) return;
    snapCooldown -= dt;

    // find right gamepad axes
    let rightAxes = null;
    for (const src of session.inputSources || []) {
      if (!src.gamepad) continue;
      // heuristic: the second gamepad we see becomes “right”
      if (!rightAxes) rightAxes = src.gamepad.axes || [];
      else { rightAxes = src.gamepad.axes || []; break; }
    }
    if (!rightAxes || snapCooldown > 0) return;

    const rx = rightAxes[2] ?? rightAxes[0] ?? 0;
    if (rx > 0.7) { xrYaw -= THREE.MathUtils.degToRad(45); snapCooldown = 0.18; applyOffset(); }
    if (rx < -0.7) { xrYaw += THREE.MathUtils.degToRad(45); snapCooldown = 0.18; applyOffset(); }
  }

  function updateTeleportPreview(leftController) {
    if (!leftController) return { point: null };

    const { origin, dir } = getRay(leftController);
    const p = hitFloor(origin, dir);
    if (!p) {
      halo.visible = false;
      rangeRing.visible = false;
      return { point: null };
    }

    // show halo at target
    halo.visible = true;
    halo.position.set(p.x, 0.02, p.z);

    // show range ring centered on player (where you are now)
    const cp = new THREE.Vector3();
    camera.getWorldPosition(cp);
    rangeRing.visible = true;
    rangeRing.position.set(cp.x, 0.02, cp.z);

    // limit teleport range (you can change this)
    const maxRange = 7.5;
    const dx = p.x - cp.x;
    const dz = p.z - cp.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    halo.scale.setScalar(dist <= maxRange ? 1.0 : 0.7);
    halo.material.opacity = dist <= maxRange ? 1.0 : 0.35;
    halo.material.transparent = true;

    return { point: (dist <= maxRange) ? p : null };
  }

  return {
    halo,
    rangeRing,
    setBaseRef,
    setSpawn,
    applyOffset,
    snapTurn,
    updateTeleportPreview,
    getRay,
    hitTest(objects, origin, dir, near = 0.01, far = 12) {
      raycaster.set(origin, dir);
      raycaster.near = near;
      raycaster.far = far;
      const hits = raycaster.intersectObjects(objects, true);
      return hits.length ? hits[0].object : null;
    }
  };
      }
