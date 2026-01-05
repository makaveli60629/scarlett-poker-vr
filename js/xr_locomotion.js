import * as THREE from "three";

export const XrLocomotion = {
  renderer: null,
  player: null,
  camera: null,
  left: null,
  right: null,
  _tmpVec: new THREE.Vector3(),
  _tmpQuat: new THREE.Quaternion(),
  _snapReady: true,
  _moveSpeed: 1.2,     // keep low
  _snapAngle: THREE.MathUtils.degToRad(45),
  _deadzone: 0.18,

  init(renderer, player, camera) {
    this.renderer = renderer;
    this.player = player;
    this.camera = camera;

    this.left = renderer.xr.getController(0);
    this.right = renderer.xr.getController(1);
    player.add(this.left);
    player.add(this.right);

    // Pointer ray on LEFT controller (comfort + consistent)
    this.addRay(this.left);
    this.addRay(this.right, true); // shorter on right

    // Add simple controller grips (optional visuals)
    const gripL = renderer.xr.getControllerGrip(0);
    const gripR = renderer.xr.getControllerGrip(1);
    player.add(gripL, gripR);
  },

  addRay(controller, short = false) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, short ? -0.5 : -2.0)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff55 });
    const line = new THREE.Line(geo, mat);
    line.name = "xr-ray";
    controller.add(line);
  },

  update(dt) {
    // Comfort movement: only move when LEFT GRIP is held
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

    // --- SNAP TURN (Right stick) ---
    if (rightGp) {
      const axX = rightGp.axes?.[2] ?? rightGp.axes?.[0] ?? 0;
      // snap left/right
      if (Math.abs(axX) > 0.65 && this._snapReady) {
        this._snapReady = false;
        const dir = axX > 0 ? -1 : 1; // invert feels better in VR
        this.player.rotation.y += dir * this._snapAngle;
      }
      if (Math.abs(axX) < 0.35) this._snapReady = true;
    }

    // --- COMFORT MOVE (Left stick, only while holding grip) ---
    if (leftGp) {
      const gripHeld = (leftGp.buttons?.[1]?.pressed) || false; // grip on many controllers
      if (!gripHeld) return;

      const axX = leftGp.axes?.[0] ?? 0;
      const axY = leftGp.axes?.[1] ?? 0;

      const x = Math.abs(axX) > this._deadzone ? axX : 0;
      const y = Math.abs(axY) > this._deadzone ? axY : 0;

      if (x === 0 && y === 0) return;

      // Move relative to headset yaw
      const yaw = this.camera.rotation.y;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);

      // forward/back is -y
      const move = new THREE.Vector3();
      move.addScaledVector(forward, -y);
      move.addScaledVector(right, x);
      move.normalize().multiplyScalar(this._moveSpeed * dt);

      this.player.position.add(move);
    }
  }
};
