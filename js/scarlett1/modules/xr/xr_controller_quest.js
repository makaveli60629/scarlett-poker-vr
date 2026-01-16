// /js/scarlett1/modules/xr/xr_controller_quest_module.js
// XR Controller Quest Module (FULL)
// Normalizes Quest inputs into ctx.input.left/right (deadzone, axis, trigger, grip, buttons).
// Prevents drift / 45-degree noise and "stuck input" when a controller disappears.

export function createXRControllerQuestModule() {
  return {
    name: "xr_controller_quest",
    onEnable(ctx) {
      const log = (...a) => console.log("[xr_controller_quest]", ...a);
      const deadzone = 0.18;
      const invertY = true;

      function dz(v) {
        v = Number(v || 0);
        if (Math.abs(v) < deadzone) return 0;
        const s = Math.sign(v);
        const a = (Math.abs(v) - deadzone) / (1 - deadzone);
        return s * Math.min(1, Math.max(0, a));
      }
      function normAxis(v) {
        v = dz(v);
        return Math.max(-1, Math.min(1, v));
      }
      function ensureHand(side) {
        ctx.input = ctx.input || {};
        if (!ctx.input[side]) {
          ctx.input[side] = {
            trigger: 0, squeeze: 0,
            stickX: 0, stickY: 0,
            a: false, b: false, x: false, y: false,
          };
        }
        return ctx.input[side];
      }

      function getSession() {
        return ctx.renderer?.xr?.getSession?.() || ctx.xrSession || null;
      }

      function getSource(handedness) {
        const s = getSession();
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

        const b = gp.buttons || [];
        const ax = gp.axes || [];

        out.trigger = Math.max(0, Math.min(1, b[0]?.value ?? 0));
        out.squeeze = Math.max(0, Math.min(1, b[1]?.value ?? 0));

        // Prefer axes[2],[3]; fallback [0],[1]
        let sx = ax[2] ?? 0, sy = ax[3] ?? 0;
        if (Math.abs(sx) < 0.001 && Math.abs(sy) < 0.001) {
          sx = ax[0] ?? 0;
          sy = ax[1] ?? 0;
        }

        out.stickX = normAxis(sx);
        out.stickY = normAxis(invertY ? -sy : sy);

        // Face buttons (best-effort)
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

      ctx.controllers = ctx.controllers || { left: null, right: null };

      this._tick = () => {
        const session = getSession();
        ctx.xrSession = session;

        const L = getSource("left");
        const R = getSource("right");

        ctx.controllers.left = L;
        ctx.controllers.right = R;

        if (!session) {
          const l = ensureHand("left");
          const r = ensureHand("right");
          l.trigger = l.squeeze = l.stickX = l.stickY = 0; l.x = l.y = false;
          r.trigger = r.squeeze = r.stickX = r.stickY = 0; r.a = r.b = false;
          return;
        }

        if (L) readGamepad(L, "left");
        if (R) readGamepad(R, "right");

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

    update() {
      try { this._tick?.(); } catch (e) { console.error("[xr_controller_quest] tick failed", e); }
    },
  };
}
