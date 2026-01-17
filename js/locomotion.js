// js/locomotion.js — Smooth move + snap turn + teleport integration hooks
import * as THREE from 'three';

export const Locomotion = (() => {
  const SPEED = 1.7;        // m/s
  const STRAFE = 1.5;       // m/s
  const DEADZONE = 0.18;
  const SNAP_DEG = 30 * Math.PI / 180;
  const SNAP_COOLDOWN = 0.22;

  function dz(v) { return Math.abs(v) < DEADZONE ? 0 : v; }

  function create({ camera, playerRig, xrInput, diag }) {
    let snapT = 0;

    function update(dt) {
      if (!xrInput) return;

      // Movement from left stick (if present)
      const lx = dz(xrInput.axes.lx || 0);
      const ly = dz(xrInput.axes.ly || 0);

      if (lx || ly) {
        // Move relative to camera yaw
        const yaw = getYaw(camera);
        const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
        const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

        const move = new THREE.Vector3();
        move.addScaledVector(forward, (-ly) * SPEED * dt);
        move.addScaledVector(right, (lx) * STRAFE * dt);

        playerRig.position.add(move);
      }

      // Snap turn from right stick X
      const rx = dz(xrInput.axes.rx || 0);
      snapT -= dt;
      if (snapT <= 0 && rx) {
        playerRig.rotation.y += (rx > 0 ? -SNAP_DEG : SNAP_DEG);
        snapT = SNAP_COOLDOWN;
      }
    }

    return { update };
  }

  function getYaw(camera) {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    return e.y;
  }

  return { create };
})();
