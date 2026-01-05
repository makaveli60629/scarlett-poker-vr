// js/controls.js — Simple XR locomotion (left stick) + ray visual
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  leftController: null,

  dead: 0.18,
  speed: 2.0,

  // ray
  ray: null,

  init(renderer, camera, player, scene) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;

    this.leftController = renderer.xr.getController(0);
    scene.add(this.leftController);

    // Ray visual attached to left controller
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -10),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
    this.ray = new THREE.Line(geom, mat);
    this.leftController.add(this.ray);
  },

  update(dt) {
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    // Read left stick from left handed input source if possible
    let axX = 0, axY = 0;

    for (const src of session.inputSources) {
      if (src?.handedness !== "left") continue;
      const gp = src.gamepad;
      if (!gp) continue;

      axX = gp.axes[2] ?? gp.axes[0] ?? 0;
      axY = gp.axes[3] ?? gp.axes[1] ?? 0;
      break;
    }

    const dz = (v) => (Math.abs(v) < this.dead ? 0 : v);
    const x = dz(axX);
    const y = dz(axY);

    // headset direction
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3(fwd.z * -1, 0, fwd.x).normalize();

    // Push up is usually negative Y => forward
    const move = new THREE.Vector3()
      .addScaledVector(fwd, (-y) * this.speed * dt)
      .addScaledVector(right, (x) * this.speed * dt);

    this.player.position.add(move);
  },
};
