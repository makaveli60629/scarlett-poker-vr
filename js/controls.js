export const Controls = {
  init(ctx) {
    this.ctx = ctx;

    // Controllers
    this.left = ctx.renderer.xr.getController(0);
    this.right = ctx.renderer.xr.getController(1);

    // Hooks set by main.js (we’ll call them if present)
    this.onMenuToggle = null;
    this.onAction = null;

    // ---------- ACTION = GRIP (squeeze) ----------
    const fireAction = () => {
      try {
        if (typeof this.onAction === "function") this.onAction(ctx);
      } catch {}
      // fallback: interactions module if present
      try {
        if (ctx.api?.interactions?.action) ctx.api.interactions.action(ctx);
      } catch {}
    };

    // Prefer squeeze events (best in XR)
    this.left?.addEventListener("squeezestart", fireAction);
    this.right?.addEventListener("squeezestart", fireAction);

    // ---------- MENU TOGGLE ----------
    const fireMenu = () => {
      try {
        if (typeof this.onMenuToggle === "function") this.onMenuToggle();
      } catch {}
    };

    // Some browsers expose "select" for certain buttons; keep as backup
    this.left?.addEventListener("selectstart", () => {
      // do nothing here; you wanted GRIP for action
    });

    // Polling fallback (reliable on Quest)
    this.lastMenuPressed = false;
    this.fireMenu = fireMenu;

    return this;
  },

  update(dt, ctx) {
    const session = ctx.renderer.xr.getSession?.();
    if (!session) return;

    // Find LEFT gamepad
    let leftGP = null;
    for (const src of session.inputSources) {
      if (src.handedness === "left" && src.gamepad) {
        leftGP = src.gamepad;
        break;
      }
    }
    if (!leftGP) {
      // fallback: any gamepad
      for (const src of session.inputSources) {
        if (src.gamepad) { leftGP = src.gamepad; break; }
      }
    }
    if (!leftGP) return;

    // Quest mappings differ by browser. We check several:
    // - "menu/hamburger" often buttons[6] or [7]
    // - X/Y often [3]/[4] (varies)
    // We treat ANY of these as menu toggle.
    const b = leftGP.buttons || [];
    const pressed = (i) => !!(b[i] && b[i].pressed);

    const menuPressed =
      pressed(6) || pressed(7) ||   // menu/system-ish if exposed
      pressed(3) || pressed(4) ||   // X/Y on some mappings
      pressed(1);                   // fallback mapping

    if (menuPressed && !this.lastMenuPressed) {
      if (typeof this.fireMenu === "function") this.fireMenu();
    }
    this.lastMenuPressed = menuPressed;
  },
};

export default Controls;
