// /js/controls.js — Scarlett Poker VR — Quest-safe movement
// - Left stick: move
// - Right stick: snap turn (45°)
// - No “height lock” drift (WebXR local-floor handles head height)
// - Works only after ENTER VR (XR session active)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  colliders: [],
  bounds: null,

  moveSpeed: 2.0,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  _tmp: new THREE.Vector3(),

  init({ renderer, camera, player, colliders = [], bounds = null }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;
  },

  update(dt) {
    // IMPORTANT: movement only works once XR session is active
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    this._snapT = Math.max(0, this._snapT - dt);

    let leftGP = null;
    let rightGP = null;

    for (const src of session.inputSources || []) {
      const gp = src?.gamepad;
      if (!gp) continue;
      if (src.handedness === "left") leftGP = gp;
      if (src.handedness === "right") rightGP = gp;
    }

    if (leftGP) this._moveFromLeftStick(leftGP, dt);
    if (rightGP) this._snapTurnFromRightStick(rightGP);
  },

  _axesMove(gp) {
    // Quest browsers vary. Prefer axes[2]/[3] if present, else [0]/[1]
    const ax = (gp.axes?.length >= 4 ? gp.axes[2] : gp.axes?.[0]) ?? 0;
    const ay = (gp.axes?.length >= 4 ? gp.axes[3] : gp.axes?.[1]) ?? 0;
    return { ax, ay };
  },

  _axesTurn(gp) {
    // Some map right stick to axes[0]/[1] instead of [2]/[3]
    const ax = (gp.axes?.length >= 4 ? gp.axes[2] : gp.axes?.[0]) ?? 0;
    return ax;
  },

  _moveFromLeftStick(gp, dt) {
    const { ax, ay } = this._axesMove(gp);

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;
    if (dx === 0 && dy === 0) return;

    // Direction from headset yaw
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(fwd, -dy);
    move.addScaledVector(right, dx);
    if (move.lengthSq() < 0.0001) return;
    move.normalize();

    const step = this.moveSpeed * dt;
    const next = this._tmp.copy(this.player.position).addScaledVector(move, step);
    this._tryMoveTo(next);
  },

  _snapTurnFromRightStick(gp) {
    if (this._snapT > 0) return;

    const ax = this._axesTurn(gp);
    if (Math.abs(ax) < 0.85) return;

    this._snapT = this.snapCooldown;

    // ax > 0 usually means turn right (but depends). We’ll use intuitive direction:
    this.player.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
  },

  _tryMoveTo(nextPos) {
    // bounds clamp
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // colliders block
    const r = 0.30;
    for (const c of this.colliders || []) {
      const box = c?.userData?.box;
      if (!box) continue;

      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) {
        return; // blocked
      }
    }

    this.player.position.copy(nextPos);
  }
};
