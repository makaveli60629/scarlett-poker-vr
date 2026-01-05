// js/input.js — Patch 6.9 FULL (Axes helpers + button unification)
// If you already have input.js, replace it with this for consistency.
//
// Provides:
// - getMoveAxes(hand)
// - getTurnAxes(hand)
// - menuPressed()
// - gripPressed()
// - sprintHeld() [optional, default false]
// - update() and init(renderer)
// - Desktop fallback: WASD + Arrow keys, M toggles menu, G/Space = grip, Shift = sprint.

export const Input = {
  renderer: null,

  // keyboard
  keys: new Set(),

  // edge states
  _menuDown: false,
  _menuPressed: false,
  _gripDown: false,
  _gripPressed: false,

  // xr cached
  _xrMenuPressed: false,
  _xrGripPressed: false,
  _xrSprintHeld: false,

  init(renderer) {
    this.renderer = renderer;

    window.addEventListener("keydown", (e) => this.keys.add((e.key || "").toLowerCase()));
    window.addEventListener("keyup", (e) => this.keys.delete((e.key || "").toLowerCase()));
  },

  update() {
    // keyboard edges
    const menuNow = this.keys.has("m");
    this._menuPressed = menuNow && !this._menuDown;
    this._menuDown = menuNow;

    const gripNow = this.keys.has("g") || this.keys.has(" ") || this.keys.has("enter");
    this._gripPressed = gripNow && !this._gripDown;
    this._gripDown = gripNow;

    // XR edges
    this._xrMenuPressed = false;
    this._xrGripPressed = false;
    this._xrSprintHeld = false;

    const s = this.renderer?.xr?.getSession?.();
    if (!s) return;

    // Try both controllers; read "menu" and "squeeze/grip" style buttons
    for (const src of (s.inputSources || [])) {
      const gp = src?.gamepad;
      if (!gp || !gp.buttons) continue;

      // Heuristic mapping:
      // - gp.buttons[3] often Y/B (menu-ish), gp.buttons[2] X/A, gp.buttons[1] B, gp.buttons[0] A
      // We'll treat ANY of these rising edges as menu if labeled "y" or "b" isn't available.
      const b = gp.buttons;

      // menu: use button[3] rising edge if possible
      const menu = !!(b[3]?.pressed);
      if (menu) this._xrMenuPressed = true;

      // grip: squeeze is often buttons[1] on some mappings, but on Quest WebXR it can be buttons[1] or [2]
      const grip = !!(b[1]?.pressed || b[2]?.pressed);
      if (grip) this._xrGripPressed = true;

      // sprint: thumbstick press sometimes [4] or [3]; we use [4] as sprint if pressed
      const sprint = !!(b[4]?.pressed);
      if (sprint) this._xrSprintHeld = true;
    }
  },

  menuPressed() {
    return this._menuPressed || this._xrMenuPressed;
  },

  gripPressed() {
    return this._gripPressed || this._xrGripPressed;
  },

  sprintHeld() {
    return this.keys.has("shift") || this._xrSprintHeld;
  },

  // Axes from XR (best effort). Desktop fallback uses WASD/arrows.
  _readAxes(hand /*left|right*/) {
    const s = this.renderer?.xr?.getSession?.();
    if (!s) return null;

    // typical: inputSources[0]=left, [1]=right (Quest)
    const idx = hand === "left" ? 0 : 1;
    const src = s.inputSources?.[idx];
    const gp = src?.gamepad;
    if (!gp || !gp.axes) return null;

    const ax = gp.axes;
    const pairs = [
      { x: ax[0] ?? 0, y: ax[1] ?? 0 },
      { x: ax[2] ?? 0, y: ax[3] ?? 0 }
    ];
    pairs.sort((a, b) => (b.x*b.x + b.y*b.y) - (a.x*a.x + a.y*a.y));
    return pairs[0];
  },

  getMoveAxes(hand) {
    const a = this._readAxes(hand);
    if (a) return a;

    // desktop fallback: WASD
    const x = (this.keys.has("d") ? 1 : 0) + (this.keys.has("a") ? -1 : 0);
    const y = (this.keys.has("w") ? 1 : 0) + (this.keys.has("s") ? -1 : 0);
    return { x, y };
  },

  getTurnAxes(hand) {
    const a = this._readAxes(hand);
    if (a) return a;

    // desktop fallback: arrows (left/right)
    const x = (this.keys.has("arrowright") ? 1 : 0) + (this.keys.has("arrowleft") ? -1 : 0);
    const y = 0;
    return { x, y };
  }
};
