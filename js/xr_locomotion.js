import * as THREE from "three";

export const XrLocomotion = {
  renderer: null,
  player: null,
  camera: null,
  left: null,
  right: null,

  _snapReady: true,
  _deadzone: 0.18,
  _moveSpeed: 1.35, // mild speed to reduce nausea
  _snapAngle: THREE.MathUtils.degToRad(45),

  init(renderer, player, camera) {
    this.renderer = renderer;
    this.player = player;
    this.camera = camera;

    this.left = renderer.xr.getController(0);
    this.right = renderer.xr.getController(1);
    player.add(this.left);
    player.add(this.right);

    // Ensure controller rays exist and are correctly parented
    this.ensureRay(this.left, false);
    this.ensureRay(this.right, true);

    const gripL = renderer.xr.getControllerGrip(0);
    const gripR = renderer.xr.getControllerGrip(1);
    player.add(gripL, gripR);
  },

  ensureRay(controller, short = false) {
    // Remove any old rays (prevents "laser stuck on table")
    const old = controller.getObjectByName("xr-ray");
    if (old) controller.remove(old);

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, short ? -0.6 : -2.2)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff55 });
    const line = new THREE.Line(geo, mat);
    line.name = "xr-ray";
    line.frustumCulled = false;
    controller.add(line);
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

    // --- SNAP TURN (Right stick X) ---
    if (rightGp) {
      const axX = rightGp.axes?.[2] ?? rightGp.axes?.[0] ?? 0;

      if (Math.abs(axX) > 0.65 && this._snapReady) {
        this._snapReady = false;
        const dir = axX > 0 ? -1 : 1; // invert feels better for many players
        this.player.rotation.y += dir * this._snapAngle;
      }
      if (Math.abs(axX) < 0.35) this._snapReady = true;
    }

    // --- MOVE (Left stick) ALWAYS ON ---
    if (leftGp) {
      const axX = leftGp.axes?.[0] ?? 0;
      const axY = leftGp.axes?.[1] ?? 0;

      const x = Math.abs(axX) > this._deadzone ? axX : 0;
      const y = Math.abs(axY) > this._deadzone ? axY : 0;

      if (x === 0 && y === 0) return;

      // Move relative to headset yaw only
      const yaw = this.camera.rotation.y;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);

      const move = new THREE.Vector3();
      move.addScaledVector(forward, -y);
      move.addScaledVector(right, x);

      // Normalize so diagonals aren't faster
      if (move.lengthSq() > 0) move.normalize();

      // Speed cap + dt
      move.multiplyScalar(this._moveSpeed * dt);
      this.player.position.add(move);
    }
  }
};
