import * as THREE from "three";

/**
 * Controls.js — XR + Desktop locomotion for Quest + Android
 * - Left stick: move (forward/back/strafe)
 * - Right stick: snap turn 45°
 * - Keeps controllers attached to rig
 */
export const Controls = {
  rig: null,
  camera: null,
  renderer: null,

  // movement tuning
  moveSpeed: 2.2,      // meters/sec
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.18,
  _snapTimer: 0,

  // controller refs
  c0: null,
  c1: null,

  // helpers
  _tmpVec: new THREE.Vector3(),
  _tmpRight: new THREE.Vector3(),
  _tmpForward: new THREE.Vector3(),

  init({ rig, camera, renderer }) {
    this.rig = rig;
    this.camera = camera;
    this.renderer = renderer;

    // XR controllers (laser pointers you already see)
    this.c0 = renderer.xr.getController(0);
    this.c1 = renderer.xr.getController(1);

    // Important: controllers must be inside the rig
    if (this.c0.parent !== rig) rig.add(this.c0);
    if (this.c1.parent !== rig) rig.add(this.c1);

    // safety: reset snap timer
    this._snapTimer = 0;
  },

  // read axes from either controller gamepad
  _getGamepadAxes() {
    const s = this.renderer.xr.getSession?.();
    if (!s) return null;

    // Search input sources for gamepads
    const sources = s.inputSources || [];
    for (const src of sources) {
      if (src && src.gamepad && src.gamepad.axes && src.gamepad.axes.length >= 2) {
        return src.gamepad.axes; // typically [lx, ly, rx, ry] (Quest)
      }
    }
    return null;
  },

  update(dt) {
    if (!this.rig || !this.camera || !this.renderer) return;

    // XR locomotion (Quest)
    if (this.renderer.xr.isPresenting) {
      const axes = this._getGamepadAxes();
      if (axes) {
        // Quest typical: axes[0]=LX, axes[1]=LY, axes[2]=RX, axes[3]=RY
        const lx = axes[0] || 0;
        const ly = axes[1] || 0;
        const rx = axes[2] || 0;

        // deadzone
        const dead = 0.14;
        const mx = Math.abs(lx) > dead ? lx : 0;
        const my = Math.abs(ly) > dead ? ly : 0;

        // Move relative to where camera is looking (yaw only)
        // forward vector from camera
        this.camera.getWorldDirection(this._tmpForward);
        this._tmpForward.y = 0;
        this._tmpForward.normalize();

        // right vector
        this._tmpRight.copy(this._tmpForward).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-1);

        // movement: forward/back = -ly (up on stick is negative)
        const speed = this.moveSpeed * dt;
        this._tmpVec.set(0, 0, 0);
        this._tmpVec.addScaledVector(this._tmpForward, (-my) * speed);
        this._tmpVec.addScaledVector(this._tmpRight, (mx) * speed);

        this.rig.position.add(this._tmpVec);

        // Snap turn with right stick (45 degrees)
        this._snapTimer -= dt;
        if (this._snapTimer <= 0) {
          const turnDead = 0.55;
          if (rx > turnDead) {
            this.rig.rotation.y -= this.snapAngle;
            this._snapTimer = this.snapCooldown;
          } else if (rx < -turnDead) {
            this.rig.rotation.y += this.snapAngle;
            this._snapTimer = this.snapCooldown;
          }
        }
      }
      return;
    }

    // Desktop/Android fallback (touch-only: no movement)
    // (You said Android is mostly for viewing; movement there is handled by your UI joystick)
  }
};
