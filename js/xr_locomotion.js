import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function makeXRLoco(renderer, camera) {
  let baseRefSpace = null;
  let offsetRefSpace = null;

  let xrYaw = 0;
  const xrOffset = new THREE.Vector3(0, 0, 0);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 36),
    new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x004466,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.visible = false;

  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 2.55, 48),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x003311,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    })
  );
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.visible = false;

  const raycaster = new THREE.Raycaster();
  const tmpMat4 = new THREE.Matrix4();
  const tmpOrigin = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  async function bindBaseRefSpace() {
    const session = renderer.xr.getSession();
    if (!session) return false;

    // Force correct, stable floor-based reference space
    try {
      baseRefSpace = await session.requestReferenceSpace("local-floor");
    } catch {
      // fallback
      baseRefSpace = await session.requestReferenceSpace("local");
    }

    applyOffset();
    return true;
  }

  function applyOffset() {
    const session = renderer.xr.getSession();
    if (!session || !baseRefSpace) return;

    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), xrYaw);
    const rot = { x: q.x, y: q.y, z: q.z, w: q.w };

    // Negative means "move world opposite of desired player movement"
    const pos = { x: -xrOffset.x, y: 0, z: -xrOffset.z };
    const t = new XRRigidTransform(pos, rot);

    offsetRefSpace = baseRefSpace.getOffsetReferenceSpace(t);
    renderer.xr.setReferenceSpace(offsetRefSpace);
  }

  function setSpawn(x, z, yawDeg = 0) {
    xrOffset.set(x, 0, z);
    xrYaw = THREE.MathUtils.degToRad(yawDeg);
    applyOffset();
  }

  function safeSpawn(anchor, roomBounds) {
    // anchor: {x,z,yawDeg}
    // roomBounds: {minX,maxX,minZ,maxZ}
    const pad = 0.8; // keep you away from walls
    const x = clamp(anchor.x, roomBounds.minX + pad, roomBounds.maxX - pad);
    const z = clamp(anchor.z, roomBounds.minZ + pad, roomBounds.maxZ - pad);
    setSpawn(x, z, anchor.yawDeg || 0);
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

  // Right stick snap turn
  let snapCooldown = 0;
  function snapTurn(dt, session, rightGamepad) {
    if (!session || !rightGamepad) return;
    snapCooldown -= dt;
    if (snapCooldown > 0) return;

    const axes = rightGamepad.axes || [];
    const rx = axes[2] ?? axes[0] ?? 0;

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

    // Player position in world
    const cp = new THREE.Vector3();
    camera.getWorldPosition(cp);

    // show preview halo
    halo.visible = true;
    halo.position.set(p.x, 0.02, p.z);

    // show range ring around player
    rangeRing.visible = true;
    rangeRing.position.set(cp.x, 0.02, cp.z);

    const maxRange = 7.5;
    const dx = p.x - cp.x;
    const dz = p.z - cp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    halo.material.opacity = dist <= maxRange ? 0.95 : 0.25;

    return { point: dist <= maxRange ? p : null };
  }

  function hitTest(objects, origin, dir, near = 0.01, far = 12) {
    raycaster.set(origin, dir);
    raycaster.near = near;
    raycaster.far = far;
    const hits = raycaster.intersectObjects(objects, true);
    return hits.length ? hits[0].object : null;
  }

  return {
    halo,
    rangeRing,
    bindBaseRefSpace,
    applyOffset,
    setSpawn,
    safeSpawn,
    snapTurn,
    updateTeleportPreview,
    getRay,
    hitFloor,
    hitTest
  };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
