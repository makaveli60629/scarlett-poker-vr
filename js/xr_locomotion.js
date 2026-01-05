import * as THREE from "three";

export const XrLocomotion = {
  renderer: null,
  player: null,
  camera: null,

  _snapReady: true,
  _deadzone: 0.18,
  _moveSpeed: 1.35,
  _snapAngle: THREE.MathUtils.degToRad(45),

  init(renderer, player, camera) {
    this.renderer = renderer;
    this.player = player;
    this.camera = camera;

    // DO NOT add rays here. Interactions.js owns the pointer ray.
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    if (c0) player.add(c0);
    if (c1) player.add(c1);

    const gripL = renderer.xr.getControllerGrip(0);
    const gripR = renderer.xr.getControllerGrip(1);
    player.add(gripL, gripR);
  },

  update(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    const srcs = session.inputSources || [];
    let leftGp = null;
    let rightGp = null;

    for (const s of srcs) {
      if (!s.gamepad) continue;
      if (s.handedness === "left") leftGp = s.gamepad;
      if (s.handedness === "right") rightGp = s.gamepad;
    }

    // Snap Turn (right stick X)
    if (rightGp) {
      const axX = rightGp.axes?.[2] ?? rightGp.axes?.[0] ?? 0;
      if (Math.abs(axX) > 0.65 && this._snapReady) {
        this._snapReady = false;
        const dir = axX > 0 ? -1 : 1;
        this.player.rotation.y += dir * this._snapAngle;
      }
      if (Math.abs(axX) < 0.35) this._snapReady = true;
    }

    // Move (left stick)
    if (leftGp) {
      const axX = leftGp.axes?.[0] ?? 0;
      const axY = leftGp.axes?.[1] ?? 0;

      const x = Math.abs(axX) > this._deadzone ? axX : 0;
      const y = Math.abs(axY) > this._deadzone ? axY : 0;
      if (x === 0 && y === 0) return;

      const yaw = this.camera.rotation.y;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);

      const move = new THREE.Vector3();
      move.addScaledVector(forward, -y);
      move.addScaledVector(right, x);
      if (move.lengthSq() > 0) move.normalize();
      move.multiplyScalar(this._moveSpeed * dt);

      this.player.position.add(move);
    }
  }
};
