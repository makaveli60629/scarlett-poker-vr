// js/xr_locomotion.js — Smooth move + 45° snap turn (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const XRLocomotion = {
  renderer: null,
  scene: null,
  rig: null,
  camera: null,

  moveSpeed: 2.1,     // meters/sec
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.18,
  _snapTimer: 0,

  init(renderer, scene, rig, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;
  },

  update(dt) {
    this._snapTimer = Math.max(0, this._snapTimer - dt);

    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    // Find gamepads
    let leftPad = null;
    let rightPad = null;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 2) continue;

      // Heuristic: handedness is reliable on Quest
      if (src.handedness === "left") leftPad = gp;
      if (src.handedness === "right") rightPad = gp;
    }

    // LEFT STICK = move
    if (leftPad) {
      const x = leftPad.axes[0] || 0; // left(-) right(+)
      const y = leftPad.axes[1] || 0; // up(-) down(+)
      const dead = 0.15;

      const ax = Math.abs(x) > dead ? x : 0;
      const ay = Math.abs(y) > dead ? y : 0;

      if (ax || ay) {
        // Move direction relative to camera yaw
        const camWorld = new THREE.Vector3();
        this.camera.getWorldPosition(camWorld);

        const yaw = this._getCameraYaw();
        const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
        const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

        // NOTE: ay is inverted: pushing forward gives negative values
        const f = forward.multiplyScalar(-ay);
        // STRAFE: keep normal sign (right should go right)
        const r = right.multiplyScalar(ax);

        const dir = f.add(r).normalize();
        const step = this.moveSpeed * dt;

        this.rig.position.addScaledVector(dir, step);
      }
    }

    // RIGHT STICK = snap turn 45°
    if (rightPad && this._snapTimer <= 0) {
      const rx = rightPad.axes[0] || 0;
      const deadTurn = 0.55;

      if (rx > deadTurn) {
        this.rig.rotation.y -= this.snapAngle;
        this._snapTimer = this.snapCooldown;
      } else if (rx < -deadTurn) {
        this.rig.rotation.y += this.snapAngle;
        this._snapTimer = this.snapCooldown;
      }
    }
  },

  _getCameraYaw() {
    const q = new THREE.Quaternion();
    this.camera.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    return e.y;
  }
};
