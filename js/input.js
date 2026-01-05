// js/input.js — Patch 6.4
// XR controller input router (Menu toggle + Grip action) with keyboard fallback.
// GitHub-safe. Works even when XR isn't active (phone).

export const Input = {
  renderer: null,

  // Edge-triggered button states
  _menuDown: false,
  _gripDown: false,
  _menuPressedFrame: false,
  _gripPressedFrame: false,

  // Keyboard fallbacks
  _kbMenuPressed: false,
  _kbGripPressed: false,

  init(renderer) {
    this.renderer = renderer;

    window.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "m") this._kbMenuPressed = true;
      if (k === "g" || k === " ") this._kbGripPressed = true;
    });
  },

  // Read XR gamepad buttons safely
  _readXRButtons() {
    let menu = false;
    let grip = false;

    try {
      const xr = this.renderer?.xr;
      const session = xr?.getSession?.();
      if (!session) return { menu, grip };

      for (const source of session.inputSources || []) {
        if (!source || !source.gamepad) continue;

        // Grip: usually buttons[1] for XR standard
        // Menu: not always exposed; on Quest it can be non-standard.
        // We'll also accept "buttons[3]" as alternate.
        const gp = source.gamepad;
        const b = gp.buttons || [];

        const gripCandidate =
          (b[1]?.pressed === true) || // standard grip
          (b[2]?.pressed === true);   // sometimes mapped differently

        // Menu is tricky; in WebXR it may not be exposed.
        // We'll treat "buttons[3]" as menu-ish if available.
        const menuCandidate =
          (b[3]?.pressed === true) ||
          (b[4]?.pressed === true);

        // Some runtimes expose "thumbstick click" or "A/X" as buttons:
        // but we don't want accidental toggles. So menu only from candidates above.
        menu = menu || menuCandidate;
        grip = grip || gripCandidate;
      }
    } catch {
      // ignore
    }

    return { menu, grip };
  },

  update() {
    this._menuPressedFrame = false;
    this._gripPressedFrame = false;

    const xr = this._readXRButtons();

    // MENU edge trigger
    const menuNow = xr.menu || this._kbMenuPressed;
    if (menuNow && !this._menuDown) this._menuPressedFrame = true;
    this._menuDown = menuNow;

    // GRIP edge trigger
    const gripNow = xr.grip || this._kbGripPressed;
    if (gripNow && !this._gripDown) this._gripPressedFrame = true;
    this._gripDown = gripNow;

    // reset keyboard pulses
    this._kbMenuPressed = false;
    this._kbGripPressed = false;
  },

  menuPressed() {
    return this._menuPressedFrame;
  },

  gripPressed() {
    return this._gripPressedFrame;
  }
};
