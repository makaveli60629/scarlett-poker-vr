// /js/scarlett1/modules/xr/android_controls_module.js
// ANDROID VIRTUAL CONTROLLERS (FULL) — Modular Forever
// - Provides L/R sticks + Trigger/Grip buttons
// - Writes into ctx.input.left/right to drive locomotion/grab modules
// - Controllers stay visible even when HUD hidden (tagged scarlettControls=1)
// - Has its OWN toggle button: "HIDE CONTROLS" / "SHOW CONTROLS"

export function createAndroidControlsModule({
  deadzone = 0.12,
  stickSize = 150,
  opacity = 0.22,
} = {}) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dz = (v) => (Math.abs(v) < deadzone ? 0 : v);

  let root, enabled = true;

  const state = {
    L: { id: null, active: false, x0: 0, y0: 0, x: 0, y: 0 },
    R: { id: null, active: false, x0: 0, y0: 0, x: 0, y: 0 },
    buttons: {
      LTrig: false, LGrip: false,
      RTrig: false, RGrip: false,
    }
  };

  function setInput(ctx) {
    // Map sticks
    const lx = dz(state.L.x);
    const ly = dz(state.L.y);
    const rx = dz(state.R.x);
    const ry = dz(state.R.y);

    ctx.input.left.stickX = lx;
    ctx.input.left.stickY = ly;

    ctx.input.right.stickX = rx;
    ctx.input.right.stickY = ry;

    // Map triggers/grips
    ctx.input.left.trigger = state.buttons.LTrig ? 1 : 0;
    ctx.input.left.squeeze = state.buttons.LGrip ? 1 : 0;

    ctx.input.right.trigger = state.buttons.RTrig ? 1 : 0;
    ctx.input.right.squeeze = state.buttons.RGrip ? 1 : 0;
  }

  function makeDiv(css) {
    const d = document.createElement("div");
    d.style.cssText = css;
    return d;
  }

  function makeStick(side, x, y) {
    const box = makeDiv(
      `position:fixed;left:${x}px;bottom:${y}px;width:${stickSize}px;height:${stickSize}px;` +
      `border-radius:999px;border:1px solid rgba(255,255,255,.25);` +
      `background:rgba(0,0,0,${opacity});backdrop-filter:blur(2px);touch-action:none;`
    );

    const nub = makeDiv(
      `position:absolute;left:50%;top:50%;width:${stickSize * 0.42}px;height:${stickSize * 0.42}px;` +
      `transform:translate(-50%,-50%);border-radius:999px;` +
      `background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);`
    );
    box.appendChild(nub);

    box.dataset.side = side;

    function updateNub(dx, dy) {
      nub.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    }

    const max = stickSize * 0.32;

    function onStart(e) {
      if (!enabled) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const id = t.identifier ?? "mouse";
      const S = side === "L" ? state.L : state.R;
      S.id = id;
      S.active = true;
      S.x0 = t.clientX;
      S.y0 = t.clientY;
      e.preventDefault();
    }

    function onMove(e) {
      if (!enabled) return;
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const S = side === "L" ? state.L : state.R;

      const t = touches.find(tt => (tt.identifier ?? "mouse") === S.id);
      if (!t || !S.active) return;

      const dx = clamp(t.clientX - S.x0, -max, max);
      const dy = clamp(t.clientY - S.y0, -max, max);

      updateNub(dx, dy);

      // normalize to [-1..1] with invert Y (up is +)
      S.x = clamp(dx / max, -1, 1);
      S.y = clamp(-dy / max, -1, 1);

      e.preventDefault();
    }

    function onEnd(e) {
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const S = side === "L" ? state.L : state.R;

      const t = touches.find(tt => (tt.identifier ?? "mouse") === S.id);
      if (!t && e.type !== "mouseup") return;

      S.active = false;
      S.id = null;
      S.x = 0; S.y = 0;
      updateNub(0, 0);
    }

    box.addEventListener("touchstart", onStart, { passive: false });
    box.addEventListener("touchmove", onMove, { passive: false });
    box.addEventListener("touchend", onEnd, { passive: false });
    box.addEventListener("touchcancel", onEnd, { passive: false });

    // mouse fallback
    box.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    return box;
  }

  function makeButton(label, left, bottom, onDown, onUp) {
    const b = makeDiv(
      `position:fixed;left:${left}px;bottom:${bottom}px;min-width:120px;` +
      `padding:10px 12px;border-radius:14px;` +
      `background:rgba(0,0,0,${opacity});border:1px solid rgba(255,255,255,.22);` +
      `color:#fff;font:12px/1.2 system-ui;touch-action:none;text-align:center;`
    );
    b.textContent = label;

    const down = (e) => { if (!enabled) return; onDown(); e.preventDefault(); };
    const up = (e) => { onUp(); e.preventDefault(); };

    b.addEventListener("touchstart", down, { passive: false });
    b.addEventListener("touchend", up, { passive: false });
    b.addEventListener("touchcancel", up, { passive: false });

    b.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);

    return b;
  }

  function makeToggleButton() {
    const t = makeDiv(
      `position:fixed;right:10px;top:10px;z-index:99999;` +
      `padding:10px 12px;border-radius:14px;` +
      `background:rgba(0,0,0,.65);border:1px solid rgba(0,255,255,.22);` +
      `color:#8ff;font:12px/1.2 system-ui;touch-action:none;`
    );
    const refresh = () => (t.textContent = enabled ? "HIDE CONTROLS" : "SHOW CONTROLS");
    refresh();

    t.addEventListener("click", () => {
      enabled = !enabled;
      refresh();
      // reset values
      state.L.x = state.L.y = 0;
      state.R.x = state.R.y = 0;
      state.buttons.LTrig = state.buttons.LGrip = false;
      state.buttons.RTrig = state.buttons.RGrip = false;

      // hide the panel body but keep toggle visible
      const body = root?.querySelector?.("[data-controls-body='1']");
      if (body) body.style.display = enabled ? "block" : "none";
    });

    return t;
  }

  function detectAndroid() {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isMobile = /Mobile/i.test(ua);
    return isAndroid && isMobile;
  }

  return {
    name: "android_controls",

    onEnable(ctx) {
      // Only show on Android mobile (not in XR)
      const isAndroid = detectAndroid();
      if (!isAndroid) {
        console.log("[android_controls] skip (not Android mobile)");
        return;
      }

      root = makeDiv(`position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99998;`);
      root.dataset.scarlettHud = "1";
      root.dataset.scarlettControls = "1"; // IMPORTANT: do not hide when HUD hidden

      const body = makeDiv(`position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:auto;`);
      body.dataset.controlsBody = "1";
      root.appendChild(body);

      // sticks
      body.appendChild(makeStick("L", 18, 24));
      body.appendChild(makeStick("R", window.innerWidth - stickSize - 18, 24));

      // buttons near right stick
      body.appendChild(makeButton("R TRIGGER", window.innerWidth - 140, 24 + stickSize + 14,
        () => (state.buttons.RTrig = true),
        () => (state.buttons.RTrig = false)
      ));
      body.appendChild(makeButton("R GRIP", window.innerWidth - 140, 24 + stickSize + 68,
        () => (state.buttons.RGrip = true),
        () => (state.buttons.RGrip = false)
      ));

      // buttons near left stick
      body.appendChild(makeButton("L TRIGGER", 18, 24 + stickSize + 14,
        () => (state.buttons.LTrig = true),
        () => (state.buttons.LTrig = false)
      ));
      body.appendChild(makeButton("L GRIP", 18, 24 + stickSize + 68,
        () => (state.buttons.LGrip = true),
        () => (state.buttons.LGrip = false)
      ));

      // toggle button (always visible)
      const toggle = makeToggleButton();
      toggle.dataset.scarlettHud = "1";
      toggle.dataset.scarlettControls = "1";
      root.appendChild(toggle);

      document.body.appendChild(root);

      console.log("[android_controls] ready ✅");
    },

    update(ctx) {
      // Don’t drive inputs while in XR session
      const inXR = !!ctx.renderer?.xr?.getSession?.();
      if (inXR) return;

      if (!root) return;
      setInput(ctx);
    }
  };
}
