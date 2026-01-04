import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createMobileJoystick(joyWrap, joyKnob) {
  const joy = {
    active: false,
    id: null,
    x: 0,
    y: 0,
    max: 55,
    baseRect: null
  };

  function setKnob(nx, ny) {
    const clampedX = Math.max(-joy.max, Math.min(joy.max, nx));
    const clampedY = Math.max(-joy.max, Math.min(joy.max, ny));
    joy.x = clampedX / joy.max;
    joy.y = clampedY / joy.max;
    joyKnob.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  }

  joyWrap.addEventListener("pointerdown", (e) => {
    joy.active = true;
    joy.id = e.pointerId;
    joy.baseRect = joyWrap.getBoundingClientRect();
    joyKnob.setPointerCapture(e.pointerId);
    setKnob(e.clientX - (joy.baseRect.left + joy.baseRect.width/2),
            e.clientY - (joy.baseRect.top + joy.baseRect.height/2));
  });

  joyWrap.addEventListener("pointermove", (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    setKnob(e.clientX - (joy.baseRect.left + joy.baseRect.width/2),
            e.clientY - (joy.baseRect.top + joy.baseRect.height/2));
  });

  const end = () => {
    joy.active = false; joy.id = null;
    joy.x = 0; joy.y = 0;
    joyKnob.style.transform = `translate(0px, 0px)`;
  };

  joyWrap.addEventListener("pointerup", end);
  joyWrap.addEventListener("pointercancel", end);

  return joy;
}

export function applyMovement({
  dt,
  rig,
  camera,
  xrSession,
  joy,
  speed = 2.2,
  turnSpeed = 2.2
}) {
  // Use joystick when not in XR (Android browser)
  const inXR = !!xrSession;

  if (!rig) return;

  let moveX = 0;
  let moveZ = 0;

  if (!inXR && joy) {
    // joy.y up is forward; invert for Z
    moveX = joy.x;
    moveZ = -joy.y;
  }

  // In XR, movement is driven by gamepad sticks (handled in main for snap turn + teleport)
  if (!inXR) {
    // Move relative to camera facing (y-locked)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const vel = new THREE.Vector3()
      .addScaledVector(right, moveX)
      .addScaledVector(forward, moveZ);

    if (vel.lengthSq() > 0.0001) {
      vel.normalize().multiplyScalar(speed * dt);
      rig.position.add(vel);
    }
  }
}
