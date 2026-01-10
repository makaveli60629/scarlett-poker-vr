// /js/controls.js — Scarlett Controls v3 (FULL)
// Supports: XR thumbsticks (if present), Android touch dock (scarlett-touch events),
// keyboard WASD, snap/smooth turn, and spawn teleports.
// Also prevents “giant height” by not adding extra Y offsets in XR local-floor.

export const Controls = {
  _inited: false,
  _ctx: null,

  init({ THREE, scene, renderer, camera, player, controllers, world, log }) {
    if (this._inited) return;
    this._inited = true;

    const state = {
      moveSpeed: 2.1,
      turnSpeed: 2.2,
      snapTurn: true,
      snapAngle: Math.PI / 6,
      snapCooldown: 0,
      keys: { w: 0, a: 0, s: 0, d: 0 },
      touch: { f: 0, b: 0, l: 0, r: 0, turnL: 0, turnR: 0 },
    };

    const getFlag = (k, fallback = true) => {
      try {
        return !!(window.__SCARLETT_FLAGS?.[k] ?? fallback);
      } catch {
        return fallback;
      }
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

    // Toggles
    window.addEventListener("scarlett-toggle-snap", (e) => (state.snapTurn = !!e.detail));
    window.addEventListener("scarlett-toggle-move", () => {});
    window.addEventListener("scarlett-toggle-teleport", () => {});

    // Recenter/teleport helpers
    this._ctx = { THREE, scene, renderer, camera, player, controllers, world, log, state };

    // Animation tick
    renderer.setAnimationLoop(() => {
      const dt = Math.min(renderer.clock?.getDelta?.() ?? 0.016, 0.033);

      // Clamp rig Y to floor (prevents “giant” feeling from bad offsets)
      if (renderer.xr.isPresenting) {
        player.position.y = 0;
      } else {
        // non-XR: keep camera around standing height unless world overrides
        if (camera.parent === player) camera.position.y = Math.max(camera.position.y, 1.6);
      }

      // Movement enabled?
      if (getFlag("move", true)) {
        this._updateMove(dt);
      }

      // Turning
      if (getFlag("snap", true)) {
        this._updateTurn(dt);
      } else {
        this._updateSmoothTurn(dt);
      }

      // Render
      renderer.render(scene, camera);
    });

    log("[controls] init ✅ (XR + touch + keyboard)");
  },

  teleportToSpawn(name = "lobby_spawn") {
    const { world, player, log } = this._ctx || {};
    const sp = world?.spawns?.[name];
    if (!sp) {
      log?.(`[controls] ⚠️ spawn not found: ${name}`);
      return;
    }
    player.position.set(sp.position.x, 0, sp.position.z);
    player.rotation.y = sp.yaw || 0;
    log?.(`[controls] ✅ teleported to ${name}`);
  },

  _getGamepadAxes() {
    const r = this._ctx?.renderer;
    try {
      const session = r?.xr?.getSession?.();
      if (!session) return null;

      // Find the first inputSource with a gamepad
      for (const src of session.inputSources || []) {
        if (src?.gamepad?.axes?.length >= 2) return src.gamepad.axes;
      }
    } catch {}
    return null;
  },

  _updateMove(dt) {
    const { THREE, camera, player, state } = this._ctx;

    // Input vector priority: XR thumbstick -> touch -> keyboard
    let x = 0,
      y = 0;

    const axes = this._getGamepadAxes();
    if (axes) {
      // Common mapping: axes[2], axes[3] for left stick on some devices, but varies.
      // We’ll support both patterns.
      const ax0 = axes[0] ?? 0;
      const ay0 = axes[1] ?? 0;
      const ax2 = axes[2] ?? 0;
      const ay3 = axes[3] ?? 0;

      // pick the stronger stick signal
      const m0 = Math.abs(ax0) + Math.abs(ay0);
      const m2 = Math.abs(ax2) + Math.abs(ay3);
      if (m2 > m0) {
        x = ax2;
        y = ay3;
      } else {
        x = ax0;
        y = ay0;
      }
    } else {
      // touch
      x = (state.touch.r ? 1 : 0) + (state.touch.l ? -1 : 0);
      y = (state.touch.b ? 1 : 0) + (state.touch.f ? -1 : 0);

      // keyboard
      x += state.keys.d ? 1 : 0;
      x += state.keys.a ? -1 : 0;
      y += state.keys.s ? 1 : 0;
      y += state.keys.w ? -1 : 0;
    }

    // deadzone
    const dz = 0.15;
    if (Math.abs(x) < dz) x = 0;
    if (Math.abs(y) < dz) y = 0;
    if (!x && !y) return;

    // Move in camera-forward plane
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(right, x);
    move.addScaledVector(forward, y);
    if (move.lengthSq() > 0) move.normalize();

    player.position.addScaledVector(move, state.moveSpeed * dt);
  },

  _updateTurn(dt) {
    const { state } = this._ctx;
    if (state.snapCooldown > 0) {
      state.snapCooldown -= dt;
      return;
    }

    // Turn input: XR right-stick if present else touch
    let t = 0;
    const axes = this._getGamepadAxes();
    if (axes) {
      // right-stick often axes[2]
      t = axes[2] ?? 0;
    } else {
      t = (state.touch.turnR ? 1 : 0) + (state.touch.turnL ? -1 : 0);
    }

    const dz = 0.35;
    if (Math.abs(t) < dz) return;

    const dir = t > 0 ? -1 : 1; // invert feels better in VR
    this._ctx.player.rotation.y += dir * state.snapAngle;
    state.snapCooldown = 0.22;
  },

  _updateSmoothTurn(dt) {
    const { state } = this._ctx;
    let t = 0;
    const axes = this._getGamepadAxes();
    if (axes) t = axes[2] ?? 0;
    else t = (state.touch.turnR ? 1 : 0) + (state.touch.turnL ? -1 : 0);

    const dz = 0.15;
    if (Math.abs(t) < dz) return;

    this._ctx.player.rotation.y += (-t) * state.turnSpeed * dt;
  },
};
