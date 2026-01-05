// js/controls.js — VR + Mobile Movement (STABLE EXPORT: Controls)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { applyZonesToPosition } from "./state.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  scene: null,

  // movement tuning
  moveSpeed: 2.0,       // meters/sec
  strafeSpeed: 2.0,
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  _snapTimer: 0,

  // mobile drag movement
  _touchActive: false,
  _touchStart: { x: 0, y: 0 },
  _touchVec: new THREE.Vector2(0, 0),

  // cached
  _dir: new THREE.Vector3(),
  _right: new THREE.Vector3(),
  _forward: new THREE.Vector3(),

  init(renderer, camera, player, scene) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.scene = scene;

    // Mobile touch "virtual stick": drag anywhere left half
    window.addEventListener("touchstart", (e) => {
      if (!e.touches?.length) return;
      const t = e.touches[0];
      this._touchActive = true;
      this._touchStart.x = t.clientX;
      this._touchStart.y = t.clientY;
      this._touchVec.set(0, 0);
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!this._touchActive || !e.touches?.length) return;
      const t = e.touches[0];
      const dx = (t.clientX - this._touchStart.x);
      const dy = (t.clientY - this._touchStart.y);
      // normalize into -1..1 range
      const nx = THREE.MathUtils.clamp(dx / 120, -1, 1);
      const ny = THREE.MathUtils.clamp(dy / 120, -1, 1);
      this._touchVec.set(nx, ny);
    }, { passive: true });

    window.addEventListener("touchend", () => {
      this._touchActive = false;
      this._touchVec.set(0, 0);
    }, { passive: true });

    // Keyboard fallback (desktop)
    this._keys = {};
    window.addEventListener("keydown", (e) => (this._keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this._keys[e.code] = false));
  },

  update(dt) {
    if (!this.player || !this.camera) return;

    // SNAP TURN cooldown
    this._snapTimer = Math.max(0, this._snapTimer - dt);

    // Build forward/right based on camera yaw
    const camWorldDir = new THREE.Vector3();
    this.camera.getWorldDirection(camWorldDir);
    camWorldDir.y = 0;
    camWorldDir.normalize();

    this._forward.copy(camWorldDir);
    this._right.set(camWorldDir.z, 0, -camWorldDir.x).normalize();

    // Read VR gamepads (Quest)
    const vr = this.renderer?.xr?.isPresenting;
    let moveX = 0, moveY = 0;
    let turnX = 0;

    if (vr) {
      const session = this.renderer.xr.getSession();
      if (session?.inputSources?.length) {
        for (const src of session.inputSources) {
          const gp = src.gamepad;
          if (!gp) continue;

          // Convention: left stick = axes[2],[3] OR axes[0],[1] depending on device
          // We’ll pick the "most non-zero" pair safely.
          const ax = gp.axes || [];
          const pairs = [
            { x: ax[0] || 0, y: ax[1] || 0 },
            { x: ax[2] || 0, y: ax[3] || 0 },
          ];
          const best = (Math.abs(pairs[0].x) + Math.abs(pairs[0].y) >
                        Math.abs(pairs[1].x) + Math.abs(pairs[1].y)) ? pairs[0] : pairs[1];

          // If this is the LEFT controller, treat as movement.
          // If we can’t detect handedness, we’ll accept the first as movement.
          if (src.handedness === "left" || src.handedness === "none") {
            moveX = best.x;
            moveY = best.y;
          }
          // Right controller snap-turn (use axes[0] or [2] whichever exists)
          if (src.handedness === "right") {
            turnX = (ax[0] ?? ax[2] ?? 0);
          }
        }
      }

      // Snap turn
      if (Math.abs(turnX) > 0.65 && this._snapTimer <= 0) {
        const dir = turnX > 0 ? -1 : 1; // invert for comfort
        this.player.rotation.y += THREE.MathUtils.degToRad(this.snapTurnDeg * dir);
        this._snapTimer = this.snapCooldown;
      }
    }

    // Mobile touch movement (drag)
    if (!vr && this._touchActive) {
      moveX = this._touchVec.x;
      moveY = this._touchVec.y;
    }

    // Keyboard movement (desktop)
    if (!vr && this._keys) {
      const k = this._keys;
      if (k["KeyA"]) moveX -= 1;
      if (k["KeyD"]) moveX += 1;
      if (k["KeyW"]) moveY -= 1;
      if (k["KeyS"]) moveY += 1;
    }

    // Deadzone
    const dz = (v) => (Math.abs(v) < 0.12 ? 0 : v);
    moveX = dz(moveX);
    moveY = dz(moveY);

    // Apply movement (moveY is typically forward = -Y on stick)
    const forwardAmt = (-moveY) * this.moveSpeed * dt;
    const strafeAmt = (moveX) * this.strafeSpeed * dt;

    this.player.position.addScaledVector(this._forward, forwardAmt);
    this.player.position.addScaledVector(this._right, strafeAmt);

    // Zone blocking (Boss Table, etc.)
    const push = applyZonesToPosition(this.player.position);
    if (push) {
      this.player.position.add(push);
    }
  }
};
