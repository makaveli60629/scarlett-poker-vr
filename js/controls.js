// js/controls.js — VR + Desktop movement (Left stick) + fixed axis direction
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  xr: null,
  camera: null,
  player: null,

  // speed tuning
  walkSpeed: 2.2,
  strafeSpeed: 2.0,

  // internal
  _tmpVec3: new THREE.Vector3(),
  _tmpQuat: new THREE.Quaternion(),
  _dir: new THREE.Vector3(),
  _right: new THREE.Vector3(),
  _fwd: new THREE.Vector3(),

  init({ renderer, camera, playerGroup }) {
    this.xr = renderer?.xr || null;
    this.camera = camera;
    this.player = playerGroup;

    // Keyboard fallback (desktop/mobile)
    this.keys = { w: false, a: false, s: false, d: false };
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k in this.keys) this.keys[k] = true;
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      if (k in this.keys) this.keys[k] = false;
    });
  },

  // Read left stick on Quest controllers
  _readLeftStick() {
    const xr = this.xr;
    if (!xr || !xr.isPresenting) return { x: 0, y: 0 };

    // controller(0) is usually left; if not, we scan both
    const s = this._stickFromController(0);
    if (Math.abs(s.x) + Math.abs(s.y) > 0.01) return s;

    const s2 = this._stickFromController(1);
    return s2;
  },

  _stickFromController(index) {
    try {
      const c = this.xr.getController(index);
      const gp = c?.gamepad;
      if (!gp || !gp.axes) return { x: 0, y: 0 };

      // Most Quest controllers: axes[2], axes[3] is thumbstick
      // Some setups: axes[0], axes[1]
      let axX = gp.axes[2] ?? gp.axes[0] ?? 0;
      let axY = gp.axes[3] ?? gp.axes[1] ?? 0;

      // DEADZONE
      const dead = 0.12;
      if (Math.abs(axX) < dead) axX = 0;
      if (Math.abs(axY) < dead) axY = 0;

      // FIX “reverse”: pushing right should move right (positive X strafe)
      // FIX forward: pushing up should move forward (negative Y -> forward)
      // Many sticks return up as -1, down as +1
      return { x: axX, y: axY };
    } catch {
      return { x: 0, y: 0 };
    }
  },

  update(dt) {
    if (!this.player || !this.camera) return;

    // VR stick movement
    const stick = this._readLeftStick();

    // Keyboard fallback
    let kx = 0, ky = 0;
    if (this.keys?.a) kx -= 1;
    if (this.keys?.d) kx += 1;
    if (this.keys?.w) ky -= 1;
    if (this.keys?.s) ky += 1;

    const moveX = stick.x || kx; // strafe
    const moveY = stick.y || ky; // forward/back

    if (Math.abs(moveX) < 0.001 && Math.abs(moveY) < 0.001) return;

    // Use camera yaw for direction
    this.camera.getWorldQuaternion(this._tmpQuat);

    // forward vector from camera
    this._fwd.set(0, 0, -1).applyQuaternion(this._tmpQuat);
    this._fwd.y = 0;
    this._fwd.normalize();

    // right vector
    this._right.copy(this._fwd).cross(new THREE.Vector3(0, 1, 0)).normalize();

    // IMPORTANT:
    // moveY: up is negative => we invert so pushing up moves forward
    const forwardAmt = (-moveY) * this.walkSpeed * dt;
    const strafeAmt = (moveX) * this.strafeSpeed * dt;

    this._dir.set(0, 0, 0);
    this._dir.addScaledVector(this._fwd, forwardAmt);
    this._dir.addScaledVector(this._right, strafeAmt);

    this.player.position.add(this._dir);
  },
};
