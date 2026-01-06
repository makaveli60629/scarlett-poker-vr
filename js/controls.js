// /js/controls.js — Scarlett Poker VR — Movement + Rainbow Ring
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

  // rainbow ring
  ring: null,
  ringMat: null,
  ringT: 0,

  _tmp: new THREE.Vector3(),

  init({ renderer, camera, player, colliders = [], bounds = null }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;

    // Build rainbow ring (shows when moving)
    const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 10, 64);
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.set(0, 0.02, 0);
    this.ring.visible = false;

    // attach to player so it stays under you
    this.player.add(this.ring);
  },

  update(dt) {
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

    let moving = false;
    if (leftGP) moving = this._moveFromLeftStick(leftGP, dt) || moving;
    if (rightGP) this._snapTurnFromRightStick(rightGP);

    // Rainbow ring behavior
    if (this.ring) {
      if (moving) {
        this.ring.visible = true;
        this.ringT += dt;

        // cycle hue by shifting RGB with sin (simple + safe)
        const r = 0.5 + 0.5 * Math.sin(this.ringT * 4.0);
        const g = 0.5 + 0.5 * Math.sin(this.ringT * 4.0 + 2.1);
        const b = 0.5 + 0.5 * Math.sin(this.ringT * 4.0 + 4.2);

        this.ringMat.color.setRGB(r, g, b);
        this.ringMat.emissive.setRGB(r, g, b);
        this.ringMat.emissiveIntensity = 1.4;
        this.ringMat.opacity = 0.95;
      } else {
        // fade out
        this.ringMat.opacity = Math.max(0, this.ringMat.opacity - dt * 2.0);
        if (this.ringMat.opacity <= 0.02) this.ring.visible = false;
      }
    }
  },

  _axesMove(gp) {
    const ax = (gp.axes?.length >= 4 ? gp.axes[2] : gp.axes?.[0]) ?? 0;
    const ay = (gp.axes?.length >= 4 ? gp.axes[3] : gp.axes?.[1]) ?? 0;
    return { ax, ay };
  },

  _axesTurn(gp) {
    const ax = (gp.axes?.length >= 4 ? gp.axes[2] : gp.axes?.[0]) ?? 0;
    return ax;
  },

  _moveFromLeftStick(gp, dt) {
    const { ax, ay } = this._axesMove(gp);

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;
    if (dx === 0 && dy === 0) return false;

    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(fwd, -dy);
    move.addScaledVector(right, dx);
    if (move.lengthSq() < 0.0001) return false;
    move.normalize();

    const step = this.moveSpeed * dt;
    const next = this._tmp.copy(this.player.position).addScaledVector(move, step);
    this._tryMoveTo(next);
    return true;
  },

  _snapTurnFromRightStick(gp) {
    if (this._snapT > 0) return;

    const ax = this._axesTurn(gp);
    if (Math.abs(ax) < 0.85) return;

    this._snapT = this.snapCooldown;
    this.player.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
  },

  _tryMoveTo(nextPos) {
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    const r = 0.30;
    for (const c of this.colliders || []) {
      const box = c?.userData?.box;
      if (!box) continue;
      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) return;
    }

    this.player.position.copy(nextPos);
  }
};
