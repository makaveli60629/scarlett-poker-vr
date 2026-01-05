// js/controls.js — Movement Core v2 (ROBUST) — STRAFE FIXED
// Export name must be: Controls

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { applyZonesToPosition } from "./state.js";

export const CONTROLS_VERSION = "Controls v2.3 (strafe fixed)";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,

  moveSpeed: 2.2,      // meters/sec
  strafeSpeed: 2.2,
  snapTurnDeg: 30,
  snapCooldown: 0.22,
  _snapTimer: 0,

  // Mobile drag
  _touchActive: false,
  _touchStart: { x: 0, y: 0 },
  _touchVec: new THREE.Vector2(0, 0),

  // Keyboard fallback
  _keys: null,

  // Cached vectors
  _forward: new THREE.Vector3(),
  _right: new THREE.Vector3(),
  _tmpDir: new THREE.Vector3(),

  init(renderer, camera, player) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;

    this._keys = {};
    window.addEventListener("keydown", (e) => (this._keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this._keys[e.code] = false));

    // Touch drag = move
    window.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches?.length) return;
        const t = e.touches[0];
        this._touchActive = true;
        this._touchStart.x = t.clientX;
        this._touchStart.y = t.clientY;
        this._touchVec.set(0, 0);
      },
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      (e) => {
        if (!this._touchActive || !e.touches?.length) return;
        const t = e.touches[0];
        const dx = t.clientX - this._touchStart.x;
        const dy = t.clientY - this._touchStart.y;
        const nx = THREE.MathUtils.clamp(dx / 130, -1, 1);
        const ny = THREE.MathUtils.clamp(dy / 130, -1, 1);
        this._touchVec.set(nx, ny);
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      () => {
        this._touchActive = false;
        this._touchVec.set(0, 0);
      },
      { passive: true }
    );
  },

  update(dt) {
    if (!this.player || !this.camera) return;

    this._snapTimer = Math.max(0, this._snapTimer - dt);

    // Compute camera yaw forward/right
    this.camera.getWorldDirection(this._tmpDir);
    this._tmpDir.y = 0;
    if (this._tmpDir.lengthSq() < 0.0001) this._tmpDir.set(0, 0, -1);
    this._tmpDir.normalize();

    this._forward.copy(this._tmpDir);
    this._right.set(this._tmpDir.z, 0, -this._tmpDir.x).normalize();

    let moveX = 0,
      moveY = 0,
      turnX = 0;

    const dead = (v) => (Math.abs(v) < 0.15 ? 0 : v);

    const vr = !!this.renderer?.xr?.isPresenting;

    // --- VR GAMEPAD (Quest) ---
    if (vr) {
      const session = this.renderer.xr.getSession();
      const sources = session?.inputSources || [];

      let bestMove = { x: 0, y: 0, mag: 0 };
      let bestTurn = { x: 0, mag: 0 };

      for (const src of sources) {
        const gp = src.gamepad;
        if (!gp) continue;
        const ax = gp.axes || [];

        const candidates = [
          { x: ax[2] ?? 0, y: ax[3] ?? 0 }, // common Quest
          { x: ax[0] ?? 0, y: ax[1] ?? 0 }, // fallback
        ];

        let localBest = candidates[0];
        const mag0 = Math.abs(candidates[0].x) + Math.abs(candidates[0].y);
        const mag1 = Math.abs(candidates[1].x) + Math.abs(candidates[1].y);
        if (mag1 > mag0) localBest = candidates[1];

        const mx = dead(localBest.x);
        const my = dead(localBest.y);
        const mmag = Math.abs(mx) + Math.abs(my);

        if (mmag > bestMove.mag) bestMove = { x: mx, y: my, mag: mmag };

        const tx = dead(ax[0] ?? ax[2] ?? 0);
        const tmag = Math.abs(tx);
        if (tmag > bestTurn.mag) bestTurn = { x: tx, mag: tmag };
      }

      moveX = bestMove.x;
      moveY = bestMove.y;
      turnX = bestTurn.x;

      // Snap turn
      if (Math.abs(turnX) > 0.65 && this._snapTimer <= 0) {
        const dir = turnX > 0 ? -1 : 1; // comfortable invert
        this.player.rotation.y += THREE.MathUtils.degToRad(this.snapTurnDeg * dir);
        this._snapTimer = this.snapCooldown;
      }
    }

    // --- Mobile drag (2D mode) ---
    if (!vr && this._touchActive) {
      moveX = dead(this._touchVec.x);
      moveY = dead(this._touchVec.y);
    }

    // --- Keyboard fallback (desktop) ---
    if (!vr && this._keys) {
      if (this._keys["KeyA"]) moveX -= 1;
      if (this._keys["KeyD"]) moveX += 1;
      if (this._keys["KeyW"]) moveY -= 1;
      if (this._keys["KeyS"]) moveY += 1;
    }

    // Apply movement (stick forward is usually -Y)
    const forwardAmt = (-moveY) * this.moveSpeed * dt;

    // ✅ STRAFE FIX: invert X so right = right on your hardware
    const strafeAmt = (-moveX) * this.strafeSpeed * dt;

    this.player.position.addScaledVector(this._forward, forwardAmt);
    this.player.position.addScaledVector(this._right, strafeAmt);

    // Zone blocking
    const push = applyZonesToPosition(this.player.position);
    if (push) this.player.position.add(push);
  },
};
