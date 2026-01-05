import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function deadzone(v, dz = 0.14) {
  return Math.abs(v) < dz ? 0 : v;
}

export const Controls = {
  init(ctx) {
    this.ctx = ctx;
    this.prevButtons = new Map();
    this.snapCooldown = 0;

    // fallback: selectstart toggles menu (reliable)
    const left = ctx.renderer.xr.getController(0);
    left.addEventListener("selectstart", () => {
      this._toggleMenu();
    });

    return this;
  },

  _toggleMenu() {
    const ctx = this.ctx;
    const t = ctx?.api?.ui?.toggleMenu || ctx?.api?.watchUI?.toggleMenu;
    if (typeof t === "function") t(ctx);
  },

  _getXRGamepads() {
    const session = this.ctx?.renderer?.xr?.getSession?.();
    if (!session) return [];
    const pads = [];
    for (const src of session.inputSources) {
      if (src?.gamepad) pads.push(src.gamepad);
    }
    return pads;
  },

  _justPressed(gp, idx) {
    if (!gp || !gp.buttons || !gp.buttons[idx]) return false;
    const key = gp;
    const prev = this.prevButtons.get(key) || [];
    const now = gp.buttons[idx].pressed;
    const was = prev[idx] || false;
    prev[idx] = now;
    this.prevButtons.set(key, prev);
    return now && !was;
  },

  update(dt, ctx) {
    const gps = this._getXRGamepads();
    if (!gps.length) return;

    // Use first gamepad for movement
    const gp = gps[0];

    // LEFT STICK: axes[2], axes[3] on Quest often, but sometimes [0],[1]
    const ax0 = deadzone(gp.axes[0] ?? 0);
    const ay0 = deadzone(gp.axes[1] ?? 0);
    const ax2 = deadzone(gp.axes[2] ?? 0);
    const ay2 = deadzone(gp.axes[3] ?? 0);

    // Choose the stick that has bigger magnitude as “move”
    const mag01 = Math.abs(ax0) + Math.abs(ay0);
    const mag23 = Math.abs(ax2) + Math.abs(ay2);

    let mx = 0, my = 0, rx = 0;
    if (mag01 >= mag23) {
      mx = ax0; my = ay0;
      rx = ax2;
    } else {
      mx = ax2; my = ay2;
      rx = ax0;
    }

    // MOVEMENT (relative to camera direction)
    const speed = 2.2; // meters/sec
    const cam = ctx.camera;
    const rig = ctx.rig;

    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -my * speed * dt);
    move.addScaledVector(right, mx * speed * dt);

    // Apply move safely on XZ
    rig.position.x += move.x;
    rig.position.z += move.z;

    // SNAP TURN (45 degrees)
    this.snapCooldown = Math.max(0, this.snapCooldown - dt);
    if (this.snapCooldown <= 0) {
      const turnStick = rx;
      if (turnStick > 0.75) {
        rig.rotation.y -= Math.PI / 4;
        this.snapCooldown = 0.25;
      } else if (turnStick < -0.75) {
        rig.rotation.y += Math.PI / 4;
        this.snapCooldown = 0.25;
      }
    }

    // MENU TOGGLE: try multiple possible button indices
    // (Quest mappings vary; this catches most)
    const menuPressed =
      this._justPressed(gp, 3) || // X
      this._justPressed(gp, 4) || // Y
      this._justPressed(gp, 1) || // B
      this._justPressed(gp, 0);   // A

    if (menuPressed) this._toggleMenu();
  },
};

export default Controls;
