import * as THREE from "three";

/**
 * CONTROLS
 * - VR laser pointer
 * - Teleport to any World.teleportSurfaces (floors + pads)
 */
export function initControls({ renderer, scene, playerGroup, camera, world, onTeleport }) {
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();

  // teleport marker
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.35, 24),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  function makeControllerLine(ctrl) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.name = "laser";
    line.scale.z = 12;
    ctrl.add(line);
    return line;
  }

  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);

  scene.add(controller1);
  scene.add(controller2);

  const line1 = makeControllerLine(controller1);
  const line2 = makeControllerLine(controller2);

  let lastHit = null;

  function getIntersections(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    // intersect only teleportable surfaces
    const targets = world.teleportSurfaces.length ? world.teleportSurfaces : [];
    return raycaster.intersectObjects(targets, true);
  }

  function updateTeleportAim() {
    const hits = getIntersections(controller1);
    if (hits.length > 0) {
      lastHit = hits[0];
      marker.position.copy(lastHit.point);
      marker.visible = true;
      line1.scale.z = lastHit.distance;
    } else {
      lastHit = null;
      marker.visible = false;
      line1.scale.z = 12;
    }
  }

  function doTeleport() {
    if (!lastHit) return;
    const p = lastHit.point.clone();

    // lift player slightly so you don't clip into floor
    p.y = 0;

    // if we aimed at a labeled pad, snap to its marker
    const obj = lastHit.object;
    if (obj?.userData?.teleportTarget && world.markers[obj.userData.teleportTarget]) {
      const target = world.markers[obj.userData.teleportTarget];
      playerGroup.position.set(target.x, 0, target.z);
      onTeleport?.(obj.userData.teleportTarget);
      return;
    }

    playerGroup.position.set(p.x, 0, p.z);
    onTeleport?.("FreeTeleport");
  }

  controller1.addEventListener("selectstart", doTeleport);
  controller2.addEventListener("selectstart", doTeleport);

  // basic keyboard fallback (desktop testing)
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "l") {
      // Lobby
      const t = world.markers?.Lobby;
      if (t) playerGroup.position.set(t.x, 0, t.z);
      onTeleport?.("Lobby");
    }
    if (e.key.toLowerCase() === "p") {
      // PokerRoom
      const t = world.markers?.PokerRoom;
      if (t) playerGroup.position.set(t.x, 0, t.z);
      onTeleport?.("PokerRoom");
    }
  });

  return {
    update() {
      updateTeleportAim();
    }
  };
}
