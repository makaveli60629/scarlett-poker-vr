// js/controls.js — Left stick move + Right stick 45° snap turn (Quest-safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,

  dead: 0.18,
  moveSpeed: 2.0,

  // snap-turn
  snapAngleDeg: 45,
  snapCooldown: 0.28,     // seconds
  _snapTimer: 0,

  // invert options
  invertStrafe: false,    // set true if right/left feels reversed
  invertForward: false,   // set true if forward/back feels reversed

  // controllers
  leftController: null,

  // ray
  ray: null,

  init(renderer, camera, player, scene) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;

    // Left controller (ray anchor)
    this.leftController = renderer.xr.getController(0);
    scene.add(this.leftController);

    // Ray line
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -10),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
    this.ray = new THREE.Line(geom, mat);
    this.leftController.add(this.ray);
  },

  _dz(v) { return Math.abs(v) < this.dead ? 0 : v; },

  update(dt) {
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    this._snapTimer = Math.max(0, this._snapTimer - dt);

    let lx = 0, ly = 0; // left stick
    let rx = 0, ry = 0; // right stick

    for (const src of session.inputSources) {
      const gp = src?.gamepad;
      if (!gp) continue;

      // Quest often reports thumbstick on axes [2,3] (some on [0,1])
      const axX = gp.axes[2] ?? gp.axes[0] ?? 0;
      const axY = gp.axes[3] ?? gp.axes[1] ?? 0;

      if (src.handedness === "left") {
        lx = axX; ly = axY;
      } else if (src.handedness === "right") {
        rx = axX; ry = axY;
      }
    }

    // --- Movement (Left stick) ---
    let strafe = this._dz(lx);
    let forward = this._dz(ly);

    // Push up is usually negative => forward
    forward = -forward;

    if (this.invertStrafe) strafe *= -1;
    if (this.invertForward) forward *= -1;

    // Headset-forward direction (yaw only)
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    // Right direction
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();

    const move = new THREE.Vector3()
      .addScaledVector(fwd, forward * this.moveSpeed * dt)
      .addScaledVector(right, strafe * this.moveSpeed * dt);

    this.player.position.add(move);

    // --- Snap turn (Right stick X) ---
    const turnX = this._dz(rx);

    if (this._snapTimer === 0 && Math.abs(turnX) > 0.55) {
      const dir = turnX > 0 ? -1 : 1; // right stick right => turn right (yaw negative in three)
      const radians = THREE.MathUtils.degToRad(this.snapAngleDeg) * dir;
      this.player.rotation.y += radians;
      this._snapTimer = this.snapCooldown;
    }

    // keep ray length stable
    if (this.ray) {
      const posAttr = this.ray.geometry.getAttribute("position");
      posAttr.setXYZ(0, 0, 0, 0);
      posAttr.setXYZ(1, 0, 0, -10);
      posAttr.needsUpdate = true;
    }
  },
};
