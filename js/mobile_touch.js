// /js/mobile_touch.js — Android 2-pad controls (Look + Move)
// Left pad = look (yaw/pitch)
// Right pad = move (forward/back + strafe) relative to camera yaw

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const MobileTouch = {
  camera: null,
  rig: null,

  lookPad: null,
  movePad: null,

  look: { active:false, id:null, sx:0, sy:0, dx:0, dy:0 },
  move: { active:false, id:null, sx:0, sy:0, dx:0, dy:0 },

  yaw: 0,
  pitch: 0,

  lookSpeed: 0.008,
  moveSpeed: 2.0,

  init({ camera, rig, padLookId="padLook", padMoveId="padMove" }) {
    this.camera = camera;
    this.rig = rig;
    this.lookPad = document.getElementById(padLookId);
    this.movePad = document.getElementById(padMoveId);

    this.yaw = rig.rotation.y;
    this.pitch = 0;

    const bind = (el, state) => {
      if (!el) return;
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture(e.pointerId);
        state.active = true;
        state.id = e.pointerId;
        state.sx = e.clientX;
        state.sy = e.clientY;
        state.dx = 0;
        state.dy = 0;
      });
      el.addEventListener("pointermove", (e) => {
        if (!state.active || state.id !== e.pointerId) return;
        state.dx = e.clientX - state.sx;
        state.dy = e.clientY - state.sy;
      });
      const up = (e) => {
        if (state.id !== e.pointerId) return;
        state.active = false;
        state.id = null;
        state.dx = state.dy = 0;
      };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };

    bind(this.lookPad, this.look);
    bind(this.movePad, this.move);
  },

  update(dt) {
    // If VR session active, Android touch still can exist, but we don't override VR.
    // We only move when NOT in XR presenting:
    // (main.js calls Controls.update for VR)
    // Here we still allow camera look for dev mode.
    const lookDX = this.look.active ? this.look.dx : 0;
    const lookDY = this.look.active ? this.look.dy : 0;

    // apply look
    this.yaw -= lookDX * this.lookSpeed;
    this.pitch -= lookDY * this.lookSpeed;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));

    this.rig.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // movement relative to camera yaw
    if (this.move.active) {
      const mx = this.move.dx;
      const my = this.move.dy;

      const ax = Math.max(-1, Math.min(1, mx / 55));  // strafe
      const ay = Math.max(-1, Math.min(1, my / 55));  // forward/back (drag up = negative)

      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();

      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();

      const move = new THREE.Vector3();
      move.addScaledVector(fwd, -ay);
      move.addScaledVector(right, ax);

      if (move.lengthSq() > 0.0001) {
        move.normalize().multiplyScalar(this.moveSpeed * dt);
        this.rig.position.add(move);
      }
    }
  }
};
