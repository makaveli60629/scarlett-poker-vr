import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function initControls({ renderer, scene, camera, playerGroup, world, ui, onTeleport }) {
  // ---------------- VR teleport (laser + reticle) ----------------
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

  let lastHit = null;

  function intersectFrom(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(world.teleportSurfaces || [], true);
  }

  function updateVRTeleportAim() {
    let hits = intersectFrom(c1);
    if (!hits.length) hits = intersectFrom(c2);

    if (hits.length) {
      lastHit = hits[0];
      reticle.position.copy(lastHit.point);
      reticle.position.y = 0.02;
      reticle.visible = true;
      const d = lastHit.distance;
      l1.scale.z = d;
      l2.scale.z = d;
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
    if (obj?.userData?.teleportTarget && world.markers?.[obj.userData.teleportTarget]) {
      const t = world.markers[obj.userData.teleportTarget];
      playerGroup.position.set(t.x, 0, t.z);
      onTeleport?.(obj.userData.teleportTarget);
      return;
    }

    const p = lastHit.point.clone();
    playerGroup.position.set(p.x, 0, p.z);
    onTeleport?.("FreeTeleport");
  }

  c1.addEventListener("selectstart", doTeleport);
  c2.addEventListener("selectstart", doTeleport);

  // ---------------- Phone/Desktop movement ----------------
  // Look controls (drag to rotate camera)
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let yaw = 0;
  let pitch = 0;

  // Move controls (virtual joystick values)
  let joyX = 0;
  let joyY = 0;

  const moveSpeed = 2.0; // meters/sec
  const clock = new THREE.Clock();

  // Touch regions:
  // - left bottom = joystick area
  // - anywhere else = look drag
  const JOY_RADIUS = 60;
  let joyActive = false;
  let joyStartX = 0;
  let joyStartY = 0;

  function isXR() {
    return renderer.xr.isPresenting;
  }

  function applyLook() {
    const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);
  }

  function onPointerDown(e) {
    if (isXR()) return; // VR uses controllers

    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (x == null || y == null) return;

    // bottom-left = joystick
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (x < w * 0.45 && y > h * 0.55) {
      joyActive = true;
      joyStartX = x;
      joyStartY = y;
      joyX = 0;
      joyY = 0;
      ui?.setPhoneJoystick?.({ active: true, x: 0, y: 0 });
      return;
    }

    dragging = true;
    lastX = x;
    lastY = y;
  }

  function onPointerMove(e) {
    if (isXR()) return;

    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (x == null || y == null) return;

    if (joyActive) {
      const dx = x - joyStartX;
      const dy = y - joyStartY;
      const clampedX = Math.max(-JOY_RADIUS, Math.min(JOY_RADIUS, dx));
      const clampedY = Math.max(-JOY_RADIUS, Math.min(JOY_RADIUS, dy));
      joyX = clampedX / JOY_RADIUS;
      joyY = clampedY / JOY_RADIUS;
      ui?.setPhoneJoystick?.({ active: true, x: joyX, y: joyY });
      return;
    }

    if (!dragging) return;

    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x;
    lastY = y;

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
      joyX = 0;
      joyY = 0;
      ui?.setPhoneJoystick?.({ active: false, x: 0, y: 0 });
    }
  }

  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });

  // Touch events for older Android browsers
  window.addEventListener("touchstart", onPointerDown, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("touchend", onPointerUp, { passive: true });

  function updatePhoneMove() {
    const dt = clock.getDelta();

    // Convert joystick into movement along camera yaw
    if (Math.abs(joyX) < 0.02 && Math.abs(joyY) < 0.02) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -joyY);
    move.addScaledVector(right, joyX);
    move.normalize();

    playerGroup.position.addScaledVector(move, moveSpeed * dt);
  }

  return {
    update() {
      if (isXR()) {
        updateVRTeleportAim();
        ui?.updateWristRay?.({ raycaster, tempMatrix, controller: c1 });
      } else {
        updatePhoneMove();
      }
    }
  };
}
