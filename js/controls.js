export const Controls = {
  init(ctx) {
    this.ctx = ctx;
    this.left = ctx.renderer.xr.getController(0);
    this.right = ctx.renderer.xr.getController(1);

    // Hooks that main.js already assigns if present
    this.onMenuToggle = null;
    this.onAction = null;

    // Action = left trigger selectstart
    this.left?.addEventListener("selectstart", () => {
      if (typeof this.onAction === "function") this.onAction();
      // fallback: tell interactions system if it exists
      if (ctx.api?.interactions?.action) {
        try { ctx.api.interactions.action(ctx); } catch {}
      }
    });

    // MENU toggle: map to button "X" (Quest left controller button)
    // We poll gamepad buttons in update()
    this.lastMenuPress = false;

    return this;
  },

  update(dt, ctx) {
    const session = ctx.renderer.xr.getSession?.();
    if (!session) return;

    // Find left-hand gamepad
    let leftGP = null;
    for (const src of session.inputSources) {
      if (src.handedness === "left" && src.gamepad) { leftGP = src.gamepad; break; }
    }
    if (!leftGP) return;

    // On Quest: X is usually buttons[4] or [3] depending on mapping
    const b3 = !!leftGP.buttons?.[3]?.pressed;
    const b4 = !!leftGP.buttons?.[4]?.pressed;
    const menuPressed = b3 || b4;

    if (menuPressed && !this.lastMenuPress) {
      if (typeof this.onMenuToggle === "function") {
        try { this.onMenuToggle(); } catch {}
      }
    }
    this.lastMenuPress = menuPressed;
  },
};

export default Controls;
