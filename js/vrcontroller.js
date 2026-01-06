// js/vrcontroller.js — Scarlett Poker VR — Quest-safe controller resolver
// Purpose: always return a valid RIGHT-hand ray space that is NOT stuck at world origin.
//
// Exports:
// - VRController.init({ renderer, scene, camera, hub })
// - VRController.update()
// - VRController.getRaySpace()   -> Object3D to raycast from (right-hand preferred)
// - VRController.getHandedness() -> "right"|"left"|"fallback-camera"

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRController = {
  renderer: null,
  scene: null,
  camera: null,
  hub: null,

  controller0: null,
  controller1: null,
  grip0: null,
  grip1: null,

  _raySpace: null,
  _mode: "fallback-camera",
  _lastIdx: 0,

  _tmpPos: new THREE.Vector3(),
  _tmpPos2: new THREE.Vector3(),

  init({ renderer, scene, camera, hub }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.hub = hub || (() => {});

    this.controller0 = renderer.xr.getController(0);
    this.controller1 = renderer.xr.getController(1);
    this.grip0 = renderer.xr.getControllerGrip(0);
    this.grip1 = renderer.xr.getControllerGrip(1);

    scene.add(this.controller0, this.controller1, this.grip0, this.grip1);

    // Default to camera until XR session begins
    this._raySpace = camera;
    this._mode = "fallback-camera";

    renderer.xr.addEventListener("sessionstart", () => {
      this.hub("✅ XR session start (VRController)");
      this.update(true);
    });

    renderer.xr.addEventListener("sessionend", () => {
      this.hub("⚠️ XR session end (VRController)");
      this._raySpace = camera;
      this._mode = "fallback-camera";
    });
  },

  // Controller pose is "valid" only if it isn't sitting at world origin
  // (Quest sometimes reports origin pose temporarily)
  _isPoseValid(obj) {
    if (!obj) return false;
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(this._tmpPos);
    // If it's basically at origin, it's probably not tracking yet
    return this._tmpPos.length() > 0.15; // > 15cm away from (0,0,0)
  },

  _getRightIndexByHandedness() {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return null;

    const srcs = session.inputSources || [];
    for (let i = 0; i < srcs.length; i++) {
      if (srcs[i]?.handedness === "right") return Math.min(i, 1);
    }
    return null;
  },

  update(forceLog = false) {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) {
      this._raySpace = this.camera;
      this._mode = "fallback-camera";
      return;
    }

    // 1) Prefer handedness if available
    const idxH = this._getRightIndexByHandedness();

    const c0 = this.controller0;
    const c1 = this.controller1;

    let chosen = null;
    let mode = "fallback-camera";

    const candidates = [];

    // If we know right index, try it first
    if (idxH === 0) candidates.push({ obj: c0, mode: "right" });
    if (idxH === 1) candidates.push({ obj: c1, mode: "right" });

    // Then try the other controller
    candidates.push({ obj: c0, mode: "left" });
    candidates.push({ obj: c1, mode: "left" });

    // 2) Pick first controller that has a non-origin pose
    for (const cand of candidates) {
      if (this._isPoseValid(cand.obj)) {
        chosen = cand.obj;
        mode = cand.mode;
        break;
      }
    }

    // 3) Final fallback: camera (never “center stuck”)
    if (!chosen) {
      chosen = this.camera;
      mode = "fallback-camera";
    }

    const changed = chosen !== this._raySpace;
    this._raySpace = chosen;
    this._mode = mode;

    if (forceLog || changed) {
      if (mode === "right") this.hub("✅ RaySpace = RIGHT controller (tracked)");
      else if (mode === "left") this.hub("⚠️ RaySpace = LEFT controller (fallback)");
      else this.hub("⚠️ RaySpace = CAMERA (fallback — controller pose not ready)");
    }
  },

  getRaySpace() {
    return this._raySpace || this.camera;
  },

  getHandedness() {
    return this._mode;
  },
};
