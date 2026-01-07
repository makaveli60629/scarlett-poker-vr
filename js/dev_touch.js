// /js/mobile_touch.js — Scarlett Poker VR — Mobile Touch Controls v1
// Left side: drag to look (yaw/pitch)
// Right side: virtual joystick to move
// Safe: only active when NOT in WebXR session

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const MobileTouch = {
  enabled: false,
  renderer: null,
  camera: null,
  player: null,
  overlay: null,

  // look
  yaw: 0,
  pitch: 0,
  lookSensitivity: 0.0032,
  pitchMin: -1.1,
  pitchMax: 1.1,

  // move
  moveSpeed: 2.0,
  joy: {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    dead: 10,
    max: 55
  },

  // touch state
  lookTouchId: null,
  lastLookX: 0,
  lastLookY: 0,

  // UI
  layer: null,
  leftHint: null,
  joyBase: null,
  joyKnob: null,

  init({ renderer, camera, player, overlay }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.overlay = overlay;

    // only show on mobile-ish environments
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    this.enabled = !!isTouch;

    // Create UI elements
    this.layer = document.getElementById("touchLayer") || document.body;

    this._buildUI();

    // Start with current player yaw
    this.yaw = player.rotation.y || 0;
    this.pitch = 0;

    // Register events
    window.addEventListener("touchstart", (e) => this._onStart(e), { passive: false });
    window.addEventListener("touchmove",  (e) => this._onMove(e),  { passive: false });
    window.addEventListener("touchend",   (e) => this._onEnd(e),   { passive: false });
    window.addEventListener("touchcancel",(e) => this._onEnd(e),   { passive: false });

    this._log("📱 MobileTouch ready (Left=Look, Right=Move)");
  },

  setEnabled(on) {
    this.enabled = !!on;
    this.layer.style.display = this.enabled ? "block" : "none";
  },

  update(dt) {
    if (!this.enabled) return;
    // Disable touch control while in VR session
    const inXR = !!this.renderer?.xr?.getSession?.();
    if (inXR) {
      // Hide UI in VR to avoid confusion
      this.layer.style.display = "none";
      return;
    } else {
      this.layer.style.display = "block";
    }

    // Apply look to player/camera
    this.player.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Move from joystick
    if (this.joy.active) {
      const nx = this.joy.dx;
      const ny = this.joy.dy;

      // deadzone
      const mag = Math.hypot(nx, ny);
      if (mag > 0.001) {
        const step = this.moveSpeed * dt;

        // forward direction from yaw only
        const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), this.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this.yaw);

        // ny is forward/back, nx is strafe
        const move = new THREE.Vector3();
        move.addScaledVector(fwd, ny);
        move.addScaledVector(right, nx);

        // normalize when pushing diagonally
        if (move.lengthSq() > 1e-6) move.normalize();

        this.player.position.addScaledVector(move, step);
      }
    }
  },

  // ---------- Touch events ----------
  _onStart(e) {
    if (!this.enabled) return;
    // prevent page scroll
    e.preventDefault();

    for (const t of e.changedTouches) {
      const x = t.clientX;
      const y = t.clientY;
      const half = window.innerWidth * 0.5;

      // Right side touch => joystick
      if (x > half && !this.joy.active) {
        this.joy.active = true;
        this.joy.id = t.identifier;
        this.joy.startX = x;
        this.joy.startY = y;
        this.joy.x = x;
        this.joy.y = y;
        this.joy.dx = 0;
        this.joy.dy = 0;

        this._showJoystick(x, y);
        continue;
      }

      // Left side => look drag (only one)
      if (x <= half && this.lookTouchId === null) {
        this.lookTouchId = t.identifier;
        this.lastLookX = x;
        this.lastLookY = y;
      }
    }
  },

  _onMove(e) {
    if (!this.enabled) return;
    e.preventDefault();

    for (const t of e.changedTouches) {
      const x = t.clientX;
      const y = t.clientY;

      // joystick move
      if (this.joy.active && t.identifier === this.joy.id) {
        const dx = x - this.joy.startX;
        const dy = y - this.joy.startY;

        // clamp to max radius
        const r = Math.hypot(dx, dy);
        const max = this.joy.max;
        let cx = dx, cy = dy;
        if (r > max) {
          const s = max / r;
          cx *= s; cy *= s;
        }

        // normalized [-1..1], invert Y so up = forward
        const nx = (Math.abs(cx) < this.joy.dead) ? 0 : (cx / max);
        const ny = (Math.abs(cy) < this.joy.dead) ? 0 : (-cy / max);

        this.joy.dx = nx;
        this.joy.dy = ny;

        this._moveJoystickKnob(this.joy.startX + cx, this.joy.startY + cy);
        continue;
      }

      // look move
      if (this.lookTouchId !== null && t.identifier === this.lookTouchId) {
        const ddx = x - this.lastLookX;
        const ddy = y - this.lastLookY;
        this.lastLookX = x;
        this.lastLookY = y;

        this.yaw   -= ddx * this.lookSensitivity;
        this.pitch -= ddy * this.lookSensitivity;

        this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
      }
    }
  },

  _onEnd(e) {
    if (!this.enabled) return;
    e.preventDefault();

    for (const t of e.changedTouches) {
      // joystick end
      if (this.joy.active && t.identifier === this.joy.id) {
        this.joy.active = false;
        this.joy.id = null;
        this.joy.dx = 0;
        this.joy.dy = 0;
        this._hideJoystick();
      }

      // look end
      if (this.lookTouchId !== null && t.identifier === this.lookTouchId) {
        this.lookTouchId = null;
      }
    }
  },

  // ---------- UI ----------
  _buildUI() {
    const layer = this.layer;

    // Left hint
    const hint = document.createElement("div");
    hint.style.position = "fixed";
    hint.style.left = "10px";
    hint.style.top = "10px";
    hint.style.padding = "8px 10px";
    hint.style.borderRadius = "10px";
    hint.style.border = "1px solid rgba(0,255,120,0.18)";
    hint.style.background = "rgba(0,0,0,0.35)";
    hint.style.color = "#00ff66";
    hint.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    hint.style.fontSize = "12px";
    hint.style.zIndex = "99991";
    hint.style.pointerEvents = "none";
    hint.textContent = "Left: Look • Right: Move";
    layer.appendChild(hint);
    this.leftHint = hint;

    // Joystick base + knob
    const base = document.createElement("div");
    base.style.position = "fixed";
    base.style.width = "120px";
    base.style.height = "120px";
    base.style.borderRadius = "60px";
    base.style.border = "2px solid rgba(0,255,120,0.28)";
    base.style.background = "rgba(0,0,0,0.25)";
    base.style.display = "none";
    base.style.zIndex = "99992";
    base.style.pointerEvents = "none";

    const knob = document.createElement("div");
    knob.style.position = "absolute";
    knob.style.left = "45px";
    knob.style.top = "45px";
    knob.style.width = "30px";
    knob.style.height = "30px";
    knob.style.borderRadius = "15px";
    knob.style.background = "rgba(0,255,120,0.45)";
    knob.style.border = "1px solid rgba(0,255,120,0.55)";
    knob.style.pointerEvents = "none";

    base.appendChild(knob);
    layer.appendChild(base);

    this.joyBase = base;
    this.joyKnob = knob;

    // show by default on touch devices
    layer.style.display = this.enabled ? "block" : "none";
  },

  _showJoystick(x, y) {
    // center base under finger
    const size = 120;
    this.joyBase.style.left = `${Math.max(0, x - size/2)}px`;
    this.joyBase.style.top  = `${Math.max(0, y - size/2)}px`;
    this.joyBase.style.display = "block";
    this._moveJoystickKnob(x, y);
  },

  _moveJoystickKnob(x, y) {
    // place knob relative to base
    const bx = parseFloat(this.joyBase.style.left || "0");
    const by = parseFloat(this.joyBase.style.top || "0");
    const size = 120;
    const ksize = 30;

    const localX = x - bx;
    const localY = y - by;

    this.joyKnob.style.left = `${Math.max(0, Math.min(size-ksize, localX - ksize/2))}px`;
    this.joyKnob.style.top  = `${Math.max(0, Math.min(size-ksize, localY - ksize/2))}px`;
  },

  _hideJoystick() {
    this.joyBase.style.display = "none";
  },

  _log(msg) {
    console.log("[MobileTouch]", msg);
    if (this.overlay) {
      const t = this.overlay.textContent || "";
      const lines = (t + "\n" + msg).split("\n").slice(-18);
      this.overlay.textContent = lines.join("\n");
    }
  }
};
