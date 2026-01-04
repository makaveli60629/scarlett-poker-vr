import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/**
 * VR TELEPORT
 * - always-visible laser
 * - floor reticle ring
 * - teleport on trigger (selectstart) + backup (squeeze)
 */
export function initControls({ renderer, scene, playerGroup, world, onTeleport }) {
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.30, 28),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  function addLaser(controller) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.name = "laser";
    line.scale.z = 12;
    controller.add(line);
    return line;
  }

  const c1 = renderer.xr.getController(0);
  const c2 = renderer.xr.getController(1);
  scene.add(c1, c2);

  const l1 = addLaser(c1);
  const l2 = addLaser(c2);

  let lastHit = null;
  let lastController = null;

  function intersectFrom(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const targets = world.teleportSurfaces || [];
    return raycaster.intersectObjects(targets, true);
  }

  function updateAim() {
    let hits = intersectFrom(c1);
    lastController = c1;

    if (!hits.length) {
      hits = intersectFrom(c2);
      lastController = c2;
    }

    if (hits.length) {
      lastHit = hits[0];

      reticle.position.copy(lastHit.point);
      reticle.position.y = 0.02;
      reticle.visible = true;

      const d = lastHit.distance;
      if (lastController === c1) l1.scale.z = d;
      if (lastController === c2) l2.scale.z = d;
    } else {
      lastHit = null;
      reticle.visible = false;
      l1.scale.z = 12;
      l2.scale.z = 12;
    }
  }

  function doTeleport() {
    if (!lastHit) return;

    const obj = lastHit.object;

    // Snap to marker if it's a named pad
    if (obj?.userData?.teleportTarget && world.markers[obj.userData.teleportTarget]) {
      const t = world.markers[obj.userData.teleportTarget];
      playerGroup.position.set(t.x, 0, t.z);
      onTeleport?.(obj.userData.teleportTarget);
      return;
    }

    // Free teleport
    const p = lastHit.point.clone();
    playerGroup.position.set(p.x, 0, p.z);
    onTeleport?.("FreeTeleport");
  }

  c1.addEventListener("selectstart", doTeleport);
  c2.addEventListener("selectstart", doTeleport);
  c1.addEventListener("squeezestart", doTeleport);
  c2.addEventListener("squeezestart", doTeleport);

  return {
    update() {
      updateAim();
    }
  };
  }
