// /js/scarlett1/modules/hand_input.js — Update 4.1 (MULTI LISTENERS)
// WebXR Hands only. Emits pinch via selectstart.
// ✅ addPinchListener(fn) so multiple modules can subscribe.

import { XRHandModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js";

export class HandInput {
  constructor({ THREE, renderer, rig, camera, scene }) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.rig = rig;
    this.camera = camera;
    this.scene = scene;

    this.hands = [null, null];
    this.handMeshes = [null, null];
    this.factory = null;

    this._pinchListeners = [];
  }

  addPinchListener(fn) {
    if (typeof fn === "function") this._pinchListeners.push(fn);
  }

  async init() {
    this.factory = new XRHandModelFactory();

    for (let i = 0; i < 2; i++) {
      const hand = this.renderer.xr.getHand(i);
      hand.name = `XR_Hand_${i}`;
      this.rig.add(hand);
      this.hands[i] = hand;

      const mesh = this.factory.createHandModel(hand, "mesh");
      hand.add(mesh);
      this.handMeshes[i] = mesh;

      hand.addEventListener("selectstart", () => {
        const info = this._getIndexTip(hand);
        if (!info) return;

        const payload = {
          handedness: this._guessHandedness(hand),
          ...info
        };

        for (const fn of this._pinchListeners) {
          try { fn(payload); } catch (e) { /* no crash */ }
        }
      });
    }
  }

  _guessHandedness(hand) {
    // Heuristic (Three hand index order is consistent enough in Quest Browser)
    if (hand.name.includes("_0")) return "left";
    if (hand.name.includes("_1")) return "right";
    return "unknown";
  }

  _getIndexTip(hand) {
    const jt = hand.joints?.["index-finger-tip"];
    if (!jt) return null;

    const pos = new this.THREE.Vector3();
    const quat = new this.THREE.Quaternion();
    jt.getWorldPosition(pos);
    jt.getWorldQuaternion(quat);
    return { jointPos: pos, jointQuat: quat };
  }

  update() {}
}
