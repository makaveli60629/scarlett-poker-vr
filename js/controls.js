// js/controls.js — Patch 6.9 FULL (Comfort Movement Pack)
// Anti-nausea movement + snap/smooth turn toggle + deadzones + accel smoothing
// Left/Right dominant locomotion switch + fixes for "ray stuck on table" feel issues.
//
// Default:
// - MOVE: Left thumbstick (Quest standard)
// - TURN: Right thumbstick (snap 45°)
// - ACTION/GRIP: handled elsewhere
//
// You can toggle settings at runtime via keyboard on phone/desktop:
// - T = toggle snap/smooth turn
// - L = toggle locomotion hand (left/right)
// - V = toggle comfort vignette
//
// If your Input module already provides axes/buttons, this uses it.
// If not, it reads directly from XR gamepads when available.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { Input } from "./input.js";

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function applyDeadzone(v, dz) {
  const av = Math.abs(v);
  if (av < dz) return 0;
  // rescale (so you don't lose range)
  const sign = Math.sign(v);
  const t = (av - dz) / (1 - dz);
  return sign * clamp(t, 0, 1);
}

function getYawFromQuat(q) {
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

function setYaw(obj, yaw) {
  obj.rotation.set(0, yaw, 0);
}

export const Controls = {
  renderer: null,
  camera: null,
  rig: null,

  // movement state
  vel: new THREE.Vector3(),
  moveWorld: new THREE.Vector3(),
  _tmp: new THREE.Vector3(),
  _tmp2: new THREE.Vector3(),
  _camYaw: 0,

  // settings (comfort defaults)
  settings: {
    locomotionHand: "left", // "left" or "right"
    turnHand: "right",      // "left" or "right"
    snapTurn: true,
    snapAngleDeg: 45,
    snapCooldown: 0.22,
    smoothTurnSpeed: 2.35,  // rad/sec
    moveSpeed: 2.0,         // m/s max
    sprintMultiplier: 1.35,
    accel: 9.0,             // higher = snappier acceleration
    decel: 10.5,
    deadzone: 0.18,
    strafe: true,
    comfortVignette: true,
    vignetteStrength: 0.55, // 0..1
    vignetteMax: 0.70,      // cap alpha
    heightLock: true,       // keep player at y=0 (prevents nausea drift)
  },

  // internal snap
  _snapT: 0,

  // vignette mesh
  vignette: null,
  vignetteMat: null,

  init(renderer, camera, rig) {
    this.renderer = renderer;
    this.camera = camera;
    this.rig = rig;

    this._snapT = 0;
    this.vel.set(0, 0, 0);

    this._buildVignette();

    // keyboard toggles for phone/desktop testing
    window.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "t") this.settings.snapTurn = !this.settings.snapTurn;
      if (k === "l") this.settings.locomotionHand = (this.settings.locomotionHand === "left" ? "right" : "left");
      if (k === "v") this.settings.comfortVignette = !this.settings.comfortVignette;
    });
  },

  _buildVignette() {
    // A large black ring in front of camera (fade in while moving)
    const geo = new THREE.RingGeometry(0.55, 1.1, 48);
    this.vignetteMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthTest: false,
      depthWrite: false
    });
    this.vignette = new THREE.Mesh(geo, this.vignetteMat);
    this.vignette.renderOrder = 999999;

    // Place it as child of camera so it stays fixed in view
    this.vignette.position.set(0, 0, -0.75);
    this.camera.add(this.vignette);
  },

  // --- XR axes helpers ---
  _getXRPad(index) {
    try {
      const s = this.renderer?.xr?.getSession?.();
      if (!s) return null;
      const src = s.inputSources?.[index];
      const gp = src?.gamepad;
      return gp || null;
    } catch {
      return null;
    }
  },

  _readAxesFromXR(hand /*"left"|"right"*/) {
    // We don't reliably know ordering across devices, but Quest uses:
    // controller0 = left, controller1 = right in most cases.
    const gp = hand === "left" ? this._getXRPad(0) : this._getXRPad(1);
    if (!gp || !gp.axes) return null;

    // Common: axes[2], axes[3] are thumbstick on some browsers, but Quest often uses [2,3] or [0,1].
    // We'll pick the pair with the largest magnitude.
    const ax = gp.axes;
    const pairs = [
      { x: ax[0] ?? 0, y: ax[1] ?? 0 },
      { x: ax[2] ?? 0, y: ax[3] ?? 0 }
    ];
    pairs.sort((a, b) => (b.x*b.x + b.y*b.y) - (a.x*a.x + a.y*a.y));
    return pairs[0];
  },

  _getMoveAxes() {
    // Prefer Input module if it provides axes (if not, XR fallback)
    if (Input?.getMoveAxes) return Input.getMoveAxes(this.settings.locomotionHand);
    const a = this._readAxesFromXR(this.settings.locomotionHand);
    if (!a) return { x: 0, y: 0 };
    return { x: a.x, y: a.y };
  },

  _getTurnAxes() {
    if (Input?.getTurnAxes) return Input.getTurnAxes(this.settings.turnHand);
    const a = this._readAxesFromXR(this.settings.turnHand);
    if (!a) return { x: 0, y: 0 };
    return { x: a.x, y: a.y };
  },

  _isSprinting() {
    // Optional: if Input provides sprint, use it. Otherwise false.
    if (Input?.sprintHeld) return !!Input.sprintHeld();
    return false;
  },

  // --- Update ---
  update(dt) {
    if (!this.rig || !this.camera) return;
    dt = clamp(dt, 0.001, 0.05);

    // 1) Turning (snap or smooth)
    const turn = this._getTurnAxes();
    let turnX = applyDeadzone(turn.x || 0, this.settings.deadzone);

    if (this._snapT > 0) this._snapT -= dt;

    if (this.settings.snapTurn) {
      if (this._snapT <= 0) {
        const threshold = 0.55; // intentional
        if (turnX > threshold) {
          this.rig.rotation.y -= THREE.MathUtils.degToRad(this.settings.snapAngleDeg);
          this._snapT = this.settings.snapCooldown;
        } else if (turnX < -threshold) {
          this.rig.rotation.y += THREE.MathUtils.degToRad(this.settings.snapAngleDeg);
          this._snapT = this.settings.snapCooldown;
        }
      }
    } else {
      // smooth turn
      this.rig.rotation.y -= turnX * this.settings.smoothTurnSpeed * dt;
    }

    // 2) Movement (camera yaw-relative)
    const mv = this._getMoveAxes();
    const mx = applyDeadzone(mv.x || 0, this.settings.deadzone);
    const my = applyDeadzone(mv.y || 0, this.settings.deadzone);

    const sprint = this._isSprinting();
    const speed = this.settings.moveSpeed * (sprint ? this.settings.sprintMultiplier : 1);

    // Determine facing yaw based on camera (so you move where you look, reduces nausea)
    this.camera.getWorldQuaternion(_tmpQuat);
    this._camYaw = getYawFromQuat(_tmpQuat);

    // forward/right vectors on ground plane
    const forward = this._tmp.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this._camYaw).normalize();
    const right = this._tmp2.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this._camYaw).normalize();

    // desired velocity in world
    const desired = this.moveWorld.set(0, 0, 0);
    desired.addScaledVector(forward, my * speed);
    if (this.settings.strafe) desired.addScaledVector(right, mx * speed);

    // acceleration smoothing
    const accel = (desired.lengthSq() > 0.0001) ? this.settings.accel : this.settings.decel;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.lerp(desired, k);

    // apply move
    this.rig.position.addScaledVector(this.vel, dt);

    // 3) Height lock
    if (this.settings.heightLock) this.rig.position.y = 0;

    // 4) Comfort vignette (fade in while moving/turning)
    this._updateVignette(dt, mx, my, turnX);
  },

  _updateVignette(dt, mx, my, turnX) {
    if (!this.vignetteMat) return;

    if (!this.settings.comfortVignette) {
      this.vignetteMat.opacity = lerp(this.vignetteMat.opacity, 0, 1 - Math.exp(-10 * dt));
      return;
    }

    const moveMag = clamp(Math.sqrt(mx*mx + my*my), 0, 1);
    const turnMag = clamp(Math.abs(turnX), 0, 1);

    // Vignette stronger during movement + a bit during turning
    const target = clamp(
      moveMag * this.settings.vignetteStrength + turnMag * (this.settings.vignetteStrength * 0.55),
      0,
      this.settings.vignetteMax
    );

    const k = 1 - Math.exp(-9 * dt);
    this.vignetteMat.opacity = lerp(this.vignetteMat.opacity, target, k);
  }
};

const _tmpQuat = new THREE.Quaternion();
