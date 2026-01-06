// /js/controller_anchor.js — 9.0 Stability Layer
// Keeps rig and XR objects sane without fighting the XR system.

import * as T from "./three.js";
const THREE = T;

export const ControllerAnchor = {
  scene: null,
  rig: null,
  camera: null,
  gripL: null,
  gripR: null,
  controllerL: null,
  controllerR: null,
  logLine: () => {},

  _tmpV: new THREE.Vector3(),
  _installed: false,

  install(opts = {}) {
    this.scene = opts.scene;
    this.rig = opts.rig;
    this.camera = opts.camera;

    this.gripL = opts.gripL;
    this.gripR = opts.gripR;
    this.controllerL = opts.controllerL;
    this.controllerR = opts.controllerR;

    this.logLine = opts.logLine || (() => {});
    this._installed = true;

    this.logLine("✅ ControllerAnchor installed.");
  },

  update() {
    if (!this._installed) return;
    if (!this.rig || !this.camera) return;

    // IMPORTANT: do NOT force rig.position.y each frame (that causes sinking/floating)
    // We only ensure the rig doesn't become NaN or explode.
    if (!Number.isFinite(this.rig.position.x) || !Number.isFinite(this.rig.position.z)) {
      this.rig.position.set(0, 0, 2.8);
      this.rig.rotation.y = 0;
      this.logLine("⚠ Rig was invalid — reset to spawn.");
    }

    // If grips exist, keep them in scene graph (sometimes lost by user edits)
    if (this.gripL && !this.gripL.parent && this.scene) this.scene.add(this.gripL);
    if (this.gripR && !this.gripR.parent && this.scene) this.scene.add(this.gripR);

    // If controllers exist, keep them in scene graph
    if (this.controllerL && !this.controllerL.parent && this.scene) this.scene.add(this.controllerL);
    if (this.controllerR && !this.controllerR.parent && this.scene) this.scene.add(this.controllerR);
  }
};
