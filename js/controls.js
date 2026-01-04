import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function initControls({ renderer, scene, camera, playerGroup, world, ui, onTeleport }) {
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();

  // ---------- VR reticle ----------
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.30, 28),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  function addLaser(controller) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 12;
    controller.add(line);
    return line;
  }

  const c1 = renderer.xr.getController(0);
  const c2 = renderer.xr.getController(1);
  scene.add(c1, c2);
  const l1 = addLaser(c1);
  const l2 = addLaser(c2);

  let lastTeleportHit = null;
  let lastInteractHit = null;

  function intersectFrom(controller, objects) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(objects || [], true);
  }

  function updateVRAim() {
    // Prefer interactables if hit, else teleport surface
    const hitsI = intersectFrom(c1, world.interactables);
    const hitsI2 = hitsI.length ? hitsI : intersectFrom(c2, world.interactables);
    lastInteractHit = hitsI2.length ? hitsI2[0] : null;

    const hitsT = intersectFrom(c1, world.teleportSurfaces);
    const hitsT2 = hitsT.length ? hitsT : intersectFrom(c2, world.teleportSurfaces);
    lastTeleportHit = hitsT2.length ? hitsT2[0] : null;

    // Reticle shows teleport target point if any
    if (lastTeleportHit) {
      reticle.position.copy(lastTeleportHit.point);
      reticle.position.y = 0.02;
      reticle.visible = true;

      const d = lastTeleportHit.distance;
      l1.scale.z = d;
      l2.scale.z = d;
    } else {
      reticle.visible = false;
      l1.scale.z = 12;
      l2.scale.z = 12;
    }
  }

  function doSelect() {
    // Click interactable first
    if (lastInteractHit?.object?.userData?.actionId) {
      ui?.handleWorldAction?.(lastInteractHit.object.userData.actionId);
      return;
    }

    // Otherwise teleport
    if (!lastTeleportHit) return;

    const obj = lastTeleportHit.object;
    if (obj?.userData?.teleportTarget && world.markers?.[obj.userData.teleportTarget]) {
      const t = world.markers[obj.userData.teleportTarget];
      playerGroup.position.set(t.x, 0, t.z);
      onTeleport?.(obj.userData.teleportTarget);
      return;
    }

    const p = lastTeleportHit.point.clone();
    playerGroup.position.set(p.x, 0, p.z);
    onTeleport?.("FreeTeleport");
  }

  c1.addEventListener("selectstart", doSelect);
  c2.addEventListener("selectstart", doSelect);

  // ---------- Phone/Desktop movement ----------
  let dragging = false, lastX = 0, lastY = 0;
  let yaw = 0, pitch = 0;

  let joyX = 0, joyY = 0;
  let joyActive = false, joyStartX = 0, joyStartY = 0;
  const JOY_RADIUS = 60;

  const moveSpeed = 2.0; // m/s
  const clock = new THREE.Clock();

  function isXR() {
    return renderer.xr.isPresenting;
  }

  function applyLook() {
    const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);
  }

  function onPointerDown(e) {
    if (isXR()) return;

    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (x == null || y == null) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // bottom-left joystick zone
    if (x < w * 0.45 && y > h * 0.55) {
      joyActive = true;
      joyStartX = x;
      joyStartY = y;
      joyX = 0; joyY = 0;
      ui?.setPhoneJoystick?.({ active: true, x: 0, y: 0 });
      return;
    }

    dragging = true;
    lastX = x; lastY = y;
  }

  function onPointerMove(e) {
    if (isXR()) return;

    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (x == null || y == null) return;

    if (joyActive) {
      const dx = x - joyStartX;
      const dy = y - joyStartY;
      const cx = Math.max(-JOY_RADIUS, Math.min(JOY_RADIUS, dx));
      const cy = Math.max(-JOY_RADIUS, Math.min(JOY_RADIUS, dy));
      joyX = cx / JOY_RADIUS;
      joyY = cy / JOY_RADIUS;
      ui?.setPhoneJoystick?.({ active: true, x: joyX, y: joyY });
      return;
    }

    if (!dragging) return;

    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x; lastY = y;

    yaw -= dx * 0.0035;
    pitch -= dy * 0.0035;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    applyLook();
  }

  function onPointerUp() {
    if (isXR()) return;

    dragging = false;
    if (joyActive) {
      joyActive = false;
      joyX = 0; joyY = 0;
      ui?.setPhoneJoystick?.({ active: false, x: 0, y: 0 });
    }
  }

  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });

  window.addEventListener("touchstart", onPointerDown, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("touchend", onPointerUp, { passive: true });

  function updatePhoneMove() {
    const dt = clock.getDelta();
    if (Math.abs(joyX) < 0.02 && Math.abs(joyY) < 0.02) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    const move = new THREE.Vector3()
      .addScaledVector(forward, -joyY)
      .addScaledVector(right, joyX);

    if (move.lengthSq() > 0.0001) move.normalize();

    playerGroup.position.addScaledVector(move, moveSpeed * dt);
  }

  // ---------- Walk-through portals ----------
  let portalCooldown = 0;

  function updatePortals() {
    // simple cooldown to avoid bounce
    portalCooldown = Math.max(0, portalCooldown - 1);
    if (portalCooldown > 0) return;

    const p = playerGroup.position;
    for (const portal of world.portals || []) {
      const dx = p.x - portal.position.x;
      const dz = p.z - portal.position.z;
      const d2 = dx * dx + dz * dz;

      if (d2 <= portal.radius * portal.radius) {
        const t = world.markers?.[portal.target];
        if (t) {
          playerGroup.position.set(t.x, 0, t.z);
          onTeleport?.(`Portal:${portal.target}`);
          portalCooldown = 60; // ~1 second @ 60fps
          return;
        }
      }
    }
  }

  return {
    update() {
      if (isXR()) {
        updateVRAim();
      } else {
        updatePhoneMove();
      }
      updatePortals();
    }
  };
}
