// js/vrcontroller.js — Scarlett Poker VR — WebXR-frame pose (Quest Browser safe)
// NO reliance on THREE controller objects (which can stick at origin on Quest).
// We pull the right-hand targetRay pose directly from XRFrame each tick.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRController = {
  renderer: null,
  camera: null,
  hub: null,

  _refSpace: null,
  _lastMode: "fallback-camera",

  // outputs (updated each tick)
  poseMatrix: new THREE.Matrix4(),
  poseQuat: new THREE.Quaternion(),
  posePos: new THREE.Vector3(),
  poseValid: false,
  mode: "fallback-camera", // "right" | "left" | "fallback-camera"

  init({ renderer, camera, hub }) {
    this.renderer = renderer;
    this.camera = camera;
    this.hub = hub || (() => {});
    this.poseValid = false;

    renderer.xr.addEventListener("sessionstart", async () => {
      try {
        const session = renderer.xr.getSession();
        // Reference space provided by Three (works across browsers)
        this._refSpace = renderer.xr.getReferenceSpace?.() || null;

        this.hub("✅ VRController: XR session started");
      } catch (e) {
        this._refSpace = null;
        this.hub("⚠️ VRController: sessionstart refspace failed");
      }
    });

    renderer.xr.addEventListener("sessionend", () => {
      this._refSpace = null;
      this.poseValid = false;
      this.mode = "fallback-camera";
      this.hub("⚠️ VRController: XR session ended");
    });
  },

  _selectSource(session) {
    const srcs = session?.inputSources || [];
    if (!srcs.length) return { src: null, mode: "fallback-camera" };

    // Prefer RIGHT
    let right = null;
    let left = null;
    for (const s of srcs) {
      if (!s?.targetRaySpace) continue;
      if (s.handedness === "right") right = s;
      if (s.handedness === "left") left = s;
    }
    if (right) return { src: right, mode: "right" };
    if (left) return { src: left, mode: "left" };

    // Fallback: first usable
    for (const s of srcs) {
      if (s?.targetRaySpace) return { src: s, mode: "left" };
    }
    return { src: null, mode: "fallback-camera" };
  },

  update() {
    const session = this.renderer?.xr?.getSession?.();
    const frame = this.renderer?.xr?.getFrame?.(); // <- key
    const refSpace = this._refSpace || this.renderer?.xr?.getReferenceSpace?.();

    this.poseValid = false;

    if (!session || !frame || !refSpace) {
      // camera fallback
      this.poseMatrix.copy(this.camera.matrixWorld);
      this.posePos.setFromMatrixPosition(this.poseMatrix);
      this.poseQuat.setFromRotationMatrix(this.poseMatrix);
      this.mode = "fallback-camera";
      this.poseValid = true;
      this._logModeIfChanged();
      return;
    }

    const { src, mode } = this._selectSource(session);
    if (!src) {
      // camera fallback
      this.poseMatrix.copy(this.camera.matrixWorld);
      this.posePos.setFromMatrixPosition(this.poseMatrix);
      this.poseQuat.setFromRotationMatrix(this.poseMatrix);
      this.mode = "fallback-camera";
      this.poseValid = true;
      this._logModeIfChanged();
      return;
    }

    // Get actual pose from XRFrame
    const pose = frame.getPose(src.targetRaySpace, refSpace);

    if (pose && pose.transform && pose.transform.matrix) {
      // pose.transform.matrix is Float32Array(16)
      this.poseMatrix.fromArray(pose.transform.matrix);
      this.posePos.setFromMatrixPosition(this.poseMatrix);
      this.poseQuat.setFromRotationMatrix(this.poseMatrix);
      this.mode = mode;
      this.poseValid = true;
      this._logModeIfChanged();
      return;
    }

    // If pose missing this frame, fallback to camera
    this.poseMatrix.copy(this.camera.matrixWorld);
    this.posePos.setFromMatrixPosition(this.poseMatrix);
    this.poseQuat.setFromRotationMatrix(this.poseMatrix);
    this.mode = "fallback-camera";
    this.poseValid = true;
    this._logModeIfChanged();
  },

  _logModeIfChanged() {
    if (this.mode === this._lastMode) return;
    this._lastMode = this.mode;

    if (this.mode === "right") this.hub("✅ Ray pose = RIGHT (XRFrame)");
    else if (this.mode === "left") this.hub("⚠️ Ray pose = LEFT (XRFrame fallback)");
    else this.hub("⚠️ Ray pose = CAMERA (fallback)");
  },

  // Convenience getters
  getRayOrigin(outVec3) {
    return outVec3.copy(this.posePos);
  },

  getRayDirection(outVec3) {
    // -Z in the pose space
    outVec3.set(0, 0, -1).applyQuaternion(this.poseQuat).normalize();
    return outVec3;
  },

  getQuat(outQuat) {
    return outQuat.copy(this.poseQuat);
  },
};
