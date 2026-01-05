// js/controls.js — stable VR locomotion + snap turn + phone fallback

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  rig: null,

  moveSpeed: 2.0,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.22,
  _snapT: 0,

  keys: { w:0,a:0,s:0,d:0, left:0,right:0, up:0, down:0 },

  init(renderer, camera, rig) {
    this.renderer = renderer;
    this.camera = camera;
    this.rig = rig;

    window.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "w") this.keys.w = 1;
      if (k === "a") this.keys.a = 1;
      if (k === "s") this.keys.s = 1;
      if (k === "d") this.keys.d = 1;
      if (k === "arrowleft") this.keys.left = 1;
      if (k === "arrowright") this.keys.right = 1;
      if (k === "arrowup") this.keys.up = 1;
      if (k === "arrowdown") this.keys.down = 1;
    });

    window.addEventListener("keyup", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "w") this.keys.w = 0;
      if (k === "a") this.keys.a = 0;
      if (k === "s") this.keys.s = 0;
      if (k === "d") this.keys.d = 0;
      if (k === "arrowleft") this.keys.left = 0;
      if (k === "arrowright") this.keys.right = 0;
      if (k === "arrowup") this.keys.up = 0;
      if (k === "arrowdown") this.keys.down = 0;
    });
  },

  update(dt) {
    if (!this.camera || !this.rig) return;

    this._snapT = Math.max(0, this._snapT - dt);

    // --- VR controller axes (if present) ---
    const session = this.renderer?.xr?.getSession?.();
    let moveX = 0, moveY = 0, turnX = 0;

    if (session && session.inputSources) {
      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp || !gp.axes) continue;

        // Heuristic: left stick often axes[2,3] or [0,1] depending
        // We'll read both and pick the one with more magnitude.
        const ax0 = gp.axes[0] || 0, ax1 = gp.axes[1] || 0;
        const ax2 = gp.axes[2] || 0, ax3 = gp.axes[3] || 0;

        const mag01 = Math.abs(ax0) + Math.abs(ax1);
        const mag23 = Math.abs(ax2) + Math.abs(ax3);

        // movement candidate
        if (mag23 > mag01) { moveX = ax2; moveY = ax3; }
        else { moveX = ax0; moveY = ax1; }

        // snap turn candidate: if we have 4 axes, use the other pair
        if (gp.axes.length >= 4) {
          // whichever pair wasn't used for movement
          if (mag23 > mag01) turnX = ax0;
          else turnX = ax2;
        }
        break;
      }
    }

    // Deadzone
    const dz = 0.18;
    if (Math.abs(moveX) < dz) moveX = 0;
    if (Math.abs(moveY) < dz) moveY = 0;
    if (Math.abs(turnX) < dz) turnX = 0;

    // Phone fallback keys
    if (!session) {
      moveY = (this.keys.w || this.keys.up) ? -1 : (this.keys.s || this.keys.down) ? 1 : 0;
      moveX = (this.keys.d) ? 1 : (this.keys.a) ? -1 : 0;
      turnX = (this.keys.right) ? 1 : (this.keys.left) ? -1 : 0;
    }

    // --- Move ---
    if (moveX !== 0 || moveY !== 0) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      right.y = 0;
      right.normalize();

      const v = new THREE.Vector3();
      v.addScaledVector(forward, -moveY);
      v.addScaledVector(right, moveX);
      v.normalize();

      this.rig.position.addScaledVector(v, this.moveSpeed * dt);
    }

    // --- Snap turn ---
    if (turnX !== 0 && this._snapT <= 0) {
      if (turnX > 0) this.rig.rotation.y -= this.snapAngle;
      else this.rig.rotation.y += this.snapAngle;
      this._snapT = this.snapCooldown;
    }
  }
};
