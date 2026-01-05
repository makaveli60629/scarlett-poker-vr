// js/controls.js — Controller setup (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  scene: null,
  rig: null,
  camera: null,

  left: null,
  right: null,

  init(renderer, scene, rig, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;

    this.left = renderer.xr.getController(0);
    this.right = renderer.xr.getController(1);

    this.left.name = "left_controller";
    this.right.name = "right_controller";

    scene.add(this.left);
    scene.add(this.right);

    // Visible rays (lasers)
    const makeRay = () => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
      const line = new THREE.Line(geom, mat);
      line.name = "laser";
      line.scale.z = 5;
      return line;
    };

    this.left.add(makeRay());
    this.right.add(makeRay());
  },

  update(_dt) {
    // (locomotion is handled in xr_locomotion.js)
  }
};
