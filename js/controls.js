import * as THREE from "three";

/**
 * XR Locomotion:
 * - Left stick: move (forward/back/strafe)
 * - Right stick: snap turn 45°
 * Works in Meta Quest Browser on GitHub Pages.
 */
export const Controls = {
  rig: null,
  camera: null,
  renderer: null,

  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.18,
  _snapTimer: 0,

  _tmpForward: new THREE.Vector3(),
  _tmpRight: new THREE.Vector3(),
  _tmpMove: new THREE.Vector3(),

  init({ rig, camera, renderer }) {
    this.rig = rig;
    this.camera = camera;
    this.renderer = renderer;
    this._snapTimer = 0;
  },

  _getXRGamepadsByHand() {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return { left: null, right: null };

    let left = null;
    let right = null;

    for (const src of session.inputSources) {
      if (!src || !src.gamepad) continue;
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }
    return { left, right };
  },

  update(dt) {
    if (!this.rig || !this.camera || !this.renderer) return;
    if (!this.renderer.xr.isPresenting) return;

    const { left, right } = this._getXRGamepadsByHand();
    if (!left && !right) return;

    const dead = 0.14;
    const lx = left?.axes?.[0] ?? 0;
    const ly = left?.axes?.[1] ?? 0;
    const rx = right?.axes?.[2] ?? right?.axes?.[0] ?? 0; // some devices map turn differently

    const mx = Math.abs(lx) > dead ? lx : 0;
    const my = Math.abs(ly) > dead ? ly : 0;

    // camera forward (yaw only)
    this.camera.getWorldDirection(this._tmpForward);
    this._tmpForward.y = 0;
    this._tmpForward.normalize();

    // right vector
    this._tmpRight.copy(this._tmpForward).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-1);

    // move: forward/back uses -ly (up is negative)
    const speed = this.moveSpeed * dt;
    this._tmpMove.set(0, 0, 0);
    this._tmpMove.addScaledVector(this._tmpForward, (-my) * speed);
    this._tmpMove.addScaledVector(this._tmpRight, (mx) * speed);

    this.rig.position.add(this._tmpMove);

    // snap turn (right stick)
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
};
