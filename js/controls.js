// js/controls.js
import * as THREE from "three";

export const Controls = {
  renderer: null,
  camera: null,
  playerRig: null,

  // XR
  controllerL: null,
  controllerR: null,

  // movement
  moveSpeed: 2.0,          // meters/sec
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.22,
  _snapTimer: 0,

  // input state
  axesL: [0, 0],
  axesR: [0, 0],
  gripPressed: false,
  menuPressed: false,
  _menuLatch: false,

  // ray visuals
  rayHand: "right", // "left" or "right"
  rayLineL: null,
  rayLineR: null,

  init(renderer, camera, playerRig) {
    this.renderer = renderer;
    this.camera = camera;
    this.playerRig = playerRig;

    const xr = renderer.xr;

    this.controllerL = xr.getController(0);
    this.controllerR = xr.getController(1);

    // Build rays
    this.rayLineL = this._buildRayLine();
    this.rayLineR = this._buildRayLine();
    this.controllerL.add(this.rayLineL);
    this.controllerR.add(this.rayLineR);

    // Default: only show right ray (can switch later)
    this._setRayVisibility();

    // Hook events
    this._bindController(this.controllerL, "left");
    this._bindController(this.controllerR, "right");
  },

  _buildRayLine() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geom, mat);
    line.scale.z = 8; // ray length
    return line;
  },

  _setRayVisibility() {
    if (!this.rayLineL || !this.rayLineR) return;
    this.rayLineL.visible = this.rayHand === "left";
    this.rayLineR.visible = this.rayHand === "right";
  },

  setRayHand(hand /* "left"|"right" */) {
    this.rayHand = hand === "left" ? "left" : "right";
    this._setRayVisibility();
  },

  _bindController(ctrl, side) {
    // WebXR Gamepad access is via ctrl.gamepad (when available)
    ctrl.addEventListener("connected", (e) => {
      // e.data.gamepad exists on Quest
      // no-op
    });

    // Trigger (select) as secondary action if needed
    ctrl.addEventListener("selectstart", () => {
      // optional
    });

    // Grip is our ACTION button (interact)
    ctrl.addEventListener("squeezestart", () => {
      this.gripPressed = true;
    });
    ctrl.addEventListener("squeezeend", () => {
      this.gripPressed = false;
    });

    // Some devices expose "menuselect" / or we do polling for buttons
  },

  // Call each frame
  update(dt, onMenuToggle) {
    // Read gamepads
    const s = this.renderer?.xr?.getSession?.();
    if (!s) return;

    // Poll input for axes/buttons
    this._pollGamepads(onMenuToggle);

    // Smooth move (left stick)
    this._applyMovement(dt);

    // Snap turn (right stick X)
    this._applySnapTurn(dt);
  },

  _pollGamepads(onMenuToggle) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    // Try find left/right input sources
    let gpL = null, gpR = null;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;

      const handed = src.handedness;
      if (handed === "left") gpL = gp;
      if (handed === "right") gpR = gp;
    }

    // Axes: typical Quest: [x,y] on thumbstick at indices 2/3 or 0/1 depending
    // We'll pick the first 2 axes if present.
    if (gpL && gpL.axes?.length >= 2) this.axesL = [gpL.axes[0], gpL.axes[1]];
    if (gpR && gpR.axes?.length >= 2) this.axesR = [gpR.axes[0], gpR.axes[1]];

    // Menu button: on Quest often button[3] (Y on left controller) or [4] etc.
    // We’ll treat: left controller button[3] OR button[2] as menu-ish
    let menuNow = false;
    if (gpL && gpL.buttons?.length) {
      const b2 = gpL.buttons[2]?.pressed; // X maybe
      const b3 = gpL.buttons[3]?.pressed; // Y maybe
      menuNow = !!(b2 || b3);
    }

    if (menuNow && !this._menuLatch) {
      this._menuLatch = true;
      if (typeof onMenuToggle === "function") onMenuToggle();
    }
    if (!menuNow) this._menuLatch = false;
  },

  _applyMovement(dt) {
    if (!this.playerRig || !this.camera) return;

    // deadzone
    const dx = this.axesL[0] || 0;
    const dy = this.axesL[1] || 0;
    const dead = 0.15;
    const x = Math.abs(dx) < dead ? 0 : dx;
    const y = Math.abs(dy) < dead ? 0 : dy;

    if (x === 0 && y === 0) return;

    // Move relative to camera yaw only
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    // forward = -y (thumbstick up is -1)
    move.addScaledVector(camDir, -y);
    move.addScaledVector(camRight, x);
    move.normalize().multiplyScalar(this.moveSpeed * dt);

    this.playerRig.position.add(move);
  },

  _applySnapTurn(dt) {
    this._snapTimer -= dt;
    if (this._snapTimer > 0) return;

    const rx = this.axesR[0] || 0;
    const dead = 0.55;
    if (rx > dead) {
      this.playerRig.rotation.y -= this.snapAngle;
      this._snapTimer = this.snapCooldown;
    } else if (rx < -dead) {
      this.playerRig.rotation.y += this.snapAngle;
      this._snapTimer = this.snapCooldown;
    }
  },

  // Expose active ray origin for interactions.js
  getActiveController() {
    return this.rayHand === "left" ? this.controllerL : this.controllerR;
  }
};
