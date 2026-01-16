// /js/scarlett1/modules/xr/xr_controller_quest_module.js
// XR Controller Quest Module (FULL)
// Goal: Normalize Quest controllers (thumbsticks, triggers, grips, buttons)
// and provide stable ctx.input.left/right for all other modules.
// Works even when not in XR; stays idle.

export function createXRControllerQuestModule() {
  return {
    name: "xr_controller_quest",
    onEnable(ctx) {
      const log = (...a) => console.log("[xr_controller_quest]", ...a);
      const err = (...a) => console.error("[xr_controller_quest]", ...a);

      const deadzone = 0.18;          // kills drift / 45-degree noise
      const snapAxis = 0.0;           // set to 0.0 for analog; could use 0.25 if you want snapping later
      const invertY = true;           // many thumbsticks report up as -1; we normalize to +up

      function dz(v) {
        v = Number(v || 0);
        if (Math.abs(v) < deadzone) return 0;
        // rescale after deadzone so it feels normal
        const s = Math.sign(v);
        const a = (Math.abs(v) - deadzone) / (1 - deadzone);
        return s * Math.min(1, Math.max(0, a));
      }

      function normAxis(v) {
        v = dz(v);
        if (snapAxis > 0) {
          const step = snapAxis;
          v = Math.round(v / step) * step;
        }
        return Math.max(-1, Math.min(1, v));
      }

      function ensureHand(side) {
        if (!ctx.input) ctx.input = {};
        if (!ctx.input[side]) {
          ctx.input[side] = {
            trigger: 0, squeeze: 0,
            stickX: 0, stickY: 0,
            a: false, b: false, x: false, y: false,
          };
        }
        return ctx.input[side];
      }

      // Find input sources for left/right
      function getSource(handedness) {
        const s = ctx.renderer?.xr?.getSession?.() || ctx.xrSession;
        if (!s || !s.inputSources) return null;
        for (const src of s.inputSources) {
          if (src && src.handedness === handedness && src.gamepad) return src;
        }
        return null;
      }

      function readGamepad(src, side) {
        const out = ensureHand(side);
        const gp = src?.gamepad;
        if (!gp) return;

        // Buttons (Quest)
        // 0 trigger, 1 squeeze (grip), 2/3 (touchpad unused), 4 X/A, 5 Y/B depending on side in some mappings
        // We'll map conservatively and also read standard indices:
        const b = gp.buttons || [];
        const ax = gp.axes || [];

        out.trigger = Math.max(0, Math.min(1, b[0]?.value ?? 0));
        out.squeeze = Math.max(0, Math.min(1, b[1]?.value ?? 0));

        // Thumbstick is usually axes[2], axes[3] on Quest; sometimes [0],[1]
        // Use a robust fallback: prefer [2],[3] if non-zero
        let sx = ax[2] ?? 0, sy = ax[3] ?? 0;
        if (Math.abs(sx) < 0.001 && Math.abs(sy) < 0.001) {
          sx = ax[0] ?? 0; sy = ax[1] ?? 0;
        }

        out.stickX = normAxis(sx);
        out.stickY = normAxis(invertY ? -sy : sy);

        // Face buttons:
        // Many browsers map primary button at index 4 or 3 depending.
        // We'll map “A/B” on right, “X/Y” on left using best guesses.
        const btn4 = !!(b[4]?.pressed);
        const btn5 = !!(b[5]?.pressed);
        const btn3 = !!(b[3]?.pressed);
        const btn2 = !!(b[2]?.pressed);

        if (side === "right") {
          out.a = btn4 || btn3;
          out.b = btn5 || btn2;
        } else {
          out.x = btn4 || btn3;
          out.y = btn5 || btn2;
        }
      }

      // Public on ctx for debugging / other modules
      ctx.controllers = ctx.controllers || { left: null, right: null };

      this._tick = () => {
        // Keep session handle fresh
        const session = ctx.renderer?.xr?.getSession?.() || ctx.xrSession || null;
        ctx.xrSession = session;

        const L = getSource("left");
        const R = getSource("right");

        ctx.controllers.left = L;
        ctx.controllers.right = R;

        // If no XR, keep values at zero so Android HUD can still display stable values
        if (!session) {
          const l = ensureHand("left");
          const r = ensureHand("right");
          l.trigger = l.squeeze = l.stickX = l.stickY = 0; l.x = l.y = false;
          r.trigger = r.squeeze = r.stickX = r.stickY = 0; r.a = r.b = false;
          return;
        }

        // Read each hand
        if (L) readGamepad(L, "left");
        if (R) readGamepad(R, "right");

        // If a controller disappears, zero it (prevents “stuck input”)
        if (!L) {
          const l = ensureHand("left");
          l.trigger = l.squeeze = l.stickX = l.stickY = 0; l.x = l.y = false;
        }
        if (!R) {
          const r = ensureHand("right");
          r.trigger = r.squeeze = r.stickX = r.stickY = 0; r.a = r.b = false;
        }
      };

      log("ready ✅ (Quest mapper)");
    },

    update(ctx) {
      try { this._tick?.(); } catch (e) { console.error("[xr_controller_quest] tick failed", e); }
    },
  };
}
