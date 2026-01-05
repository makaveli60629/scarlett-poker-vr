// js/controls.js — GitHub Pages SAFE
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  playerRig: null,

  moveSpeed: 2.2, // meters/sec
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.22,
  _snapTimer: 0,

  axesL: [0, 0],
  axesR: [0, 0],

  init(renderer, camera, playerRig) {
    this.renderer = renderer;
    this.camera = camera;
    this.playerRig = playerRig;
  },

  update(dt) {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    let gpL = null, gpR = null;
    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }

    if (gpL?.axes?.length >= 2) this.axesL = [gpL.axes[0], gpL.axes[1]];
    if (gpR?.axes?.length >= 2) this.axesR = [gpR.axes[0], gpR.axes[1]];

    this._applyMove(dt);
    this._applySnapTurn(dt);
  },

  _applyMove(dt) {
    const dx = this.axesL[0] || 0;
    const dy = this.axesL[1] || 0;
    const dead = 0.15;

    const x = Math.abs(dx) < dead ? 0 : dx;
    const y = Math.abs(dy) < dead ? 0 : dy;
    if (!x && !y) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -y); // stick up is -1
    move.addScaledVector(right, x);

    if (move.lengthSq() < 1e-6) return;
    move.normalize().multiplyScalar(this.moveSpeed * dt);

    this.playerRig.position.add(move);
  },

  _applySnapTurn(dt) {
    this._snapTimer -= dt;
    if (this._snapTimer > 0) return;

    const rx = this.axesR[0] || 0;
    const dead = 0.55;

    if (rx > dead) {
      this.playerRig.rotation.y -= this.snapAngle;
      this._snapTimer = this.snapCooldown;
    } else if (rx < -dead) {
      this.playerRig.rotation.y += this.snapAngle;
      this._snapTimer = this.snapCooldown;
    }
  }
};
