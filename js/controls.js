// /js/controls.js — Scarlett Controls v3.2 (FULL)
// FIX: Does NOT set renderer.setAnimationLoop (main.js owns the loop).
// Provides: update(dt), XR thumbsticks (Quest), Android dock (scarlett-touch),
// keyboard WASD, snap/smooth turning, and spawn teleports.
// Prevents “giant height” by never adding Y offsets in XR local-floor.

export const Controls = {
  _inited: false,
  _ctx: null,

  init({ THREE, scene, renderer, camera, player, controllers, world, log }) {
    if (this._inited) return this;
    this._inited = true;

    const state = {
      moveSpeed: 2.15,        // m/s
      turnSpeed: 2.35,        // rad/s
      snapTurn: true,
      snapAngle: Math.PI / 6, // 30°
      snapCooldown: 0,

      keys: { w: 0, a: 0, s: 0, d: 0 },
      touch: { f: 0, b: 0, l: 0, r: 0, turnL: 0, turnR: 0 },
    };

    const getFlag = (k, fallback = true) => {
      try { return !!(window.__SCARLETT_FLAGS?.[k] ?? fallback); }
      catch { return fallback; }
    };

    // Keyboard fallback
    window.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "w") state.keys.w = 1;
      if (k === "a") state.keys.a = 1;
      if (k === "s") state.keys.s = 1;
      if (k === "d") state.keys.d = 1;
    });
    window.addEventListener("keyup", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "w") state.keys.w = 0;
      if (k === "a") state.keys.a = 0;
      if (k === "s") state.keys.s = 0;
      if (k === "d") state.keys.d = 0;
    });

    // Android touch dock -> scarlett-touch
    window.addEventListener("scarlett-touch", (e) => {
      if (!e?.detail) return;
      state.touch = Object.assign(state.touch, e.detail);
    });

    // Toggles (read by getFlag)
    window.addEventListener("scarlett-toggle-snap", (e) => (state.snapTurn = !!e.detail));

    // store ctx
    this._ctx = { THREE, scene, renderer, camera, player, controllers, world, log, state, getFlag };

    log?.("[controls] init ✅ (no animationLoop; main drives update())");
    return this;
  },

  // main.js calls this every frame
  update(dt = 0.016) {
    const ctx = this._ctx;
    if (!ctx) return;

    const { renderer, player, camera, state, getFlag } = ctx;

    // Keep rig on floor in XR local-floor (prevents “giant / floating pad”)
    if (renderer?.xr?.isPresenting) {
      player.position.y = 0;
    } else {
      // non-XR: keep camera at standing height if it got reset
      if (camera.parent === player) camera.position.y = Math.max(camera.position.y, 1.6);
    }

    // Movement
    if (getFlag("move", true)) this._updateMove(dt);

    // Turning
    if (getFlag("snap", true) && state.snapTurn) this._updateSnapTurn(dt);
    else this._updateSmoothTurn(dt);
  },

  teleportToSpawn(name = "lobby_spawn") {
    const { world, player, log } = this._ctx || {};
    const sp = world?.spawns?.[name];
    if (!sp) {
      log?.(`[controls] ⚠️ spawn not found: ${name}`);
      return;
    }
    // Only set XZ + yaw; NEVER add Y in local-floor
    player.position.set(sp.position.x, 0, sp.position.z);
    player.rotation.y = sp.yaw || 0;
    log?.(`[controls] ✅ teleported to ${name}`);
  },

  // -------- XR Input Helpers --------
  _getSession() {
    try { return this._ctx?.renderer?.xr?.getSession?.() || null; }
    catch { return null; }
  },

  _getGamepadByHand(handedness /* "left" | "right" */) {
    const s = this._getSession();
    if (!s?.inputSources) return null;

    try {
      for (const src of s.inputSources) {
        if (!src?.gamepad) continue;
        if (src.handedness === handedness) return src.gamepad;
      }
      // fallback: first gamepad
      for (const src of s.inputSources) {
        if (src?.gamepad) return src.gamepad;
      }
    } catch {}
    return null;
  },

  // -------- Movement --------
  _updateMove(dt) {
    const { THREE, camera, player, state } = this._ctx;

    let x = 0, y = 0;

    // Prefer XR left stick (Quest): axes[0]=x, axes[1]=y
    const gpL = this._getGamepadByHand("left");
    if (gpL?.axes?.length >= 2) {
      x = gpL.axes[0] ?? 0;
      y = gpL.axes[1] ?? 0;
    } else {
      // Touch dock
      x = (state.touch.r ? 1 : 0) + (state.touch.l ? -1 : 0);
      y = (state.touch.b ? 1 : 0) + (state.touch.f ? -1 : 0);

      // Keyboard
      x += state.keys.d ? 1 : 0;
      x += state.keys.a ? -1 : 0;
      y += state.keys.s ? 1 : 0;
      y += state.keys.w ? -1 : 0;
    }

    // deadzone
    const dz = 0.16;
    if (Math.abs(x) < dz) x = 0;
    if (Math.abs(y) < dz) y = 0;
    if (!x && !y) return;

    // Move in camera-forward plane
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(right, x);
    move.addScaledVector(forward, y);
    if (move.lengthSq() > 0) move.normalize();

    player.position.addScaledVector(move, state.moveSpeed * dt);
  },

  // -------- Turning --------
  _updateSnapTurn(dt) {
    const { player, state } = this._ctx;

    if (state.snapCooldown > 0) {
      state.snapCooldown -= dt;
      return;
    }

    // Prefer XR right stick X. On Quest: axes[2]/[3] sometimes exist,
    // but safest is right controller axes[0]/[1] for its stick.
    let t = 0;
    const gpR = this._getGamepadByHand("right");
    if (gpR?.axes?.length >= 1) {
      // Most reliable for right controller stick X:
      t = gpR.axes[0] ?? 0;
      // If a device uses axes[2] for right stick, take the stronger:
      if (gpR.axes.length >= 3) {
        const a0 = Math.abs(gpR.axes[0] ?? 0);
        const a2 = Math.abs(gpR.axes[2] ?? 0);
        if (a2 > a0) t = gpR.axes[2] ?? 0;
      }
    } else {
      // Touch dock
      t = (state.touch.turnR ? 1 : 0) + (state.touch.turnL ? -1 : 0);
    }

    const dz = 0.35;
    if (Math.abs(t) < dz) return;

    const dir = t > 0 ? -1 : 1; // VR feel
    player.rotation.y += dir * state.snapAngle;
    state.snapCooldown = 0.22;
  },

  _updateSmoothTurn(dt) {
    const { player, state } = this._ctx;

    let t = 0;
    const gpR = this._getGamepadByHand("right");
    if (gpR?.axes?.length >= 1) {
      t = gpR.axes[0] ?? 0;
      if (gpR.axes.length >= 3) {
        const a0 = Math.abs(gpR.axes[0] ?? 0);
        const a2 = Math.abs(gpR.axes[2] ?? 0);
        if (a2 > a0) t = gpR.axes[2] ?? 0;
      }
    } else {
      t = (state.touch.turnR ? 1 : 0) + (state.touch.turnL ? -1 : 0);
    }

    const dz = 0.15;
    if (Math.abs(t) < dz) return;

    player.rotation.y += (-t) * state.turnSpeed * dt;
  },
};
