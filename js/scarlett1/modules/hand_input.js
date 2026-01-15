// /js/scarlett1/modules/hand_input.js
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

    this.onPinch = null; // callback({handedness, jointPos, jointQuat})
  }

  async init() {
    const THREE = this.THREE;

    this.factory = new XRHandModelFactory();

    for (let i = 0; i < 2; i++) {
      const hand = this.renderer.xr.getHand(i);
      hand.name = `XR_Hand_${i}`;
      this.rig.add(hand);
      this.hands[i] = hand;

      const mesh = this.factory.createHandModel(hand, "mesh");
      hand.add(mesh);
      this.handMeshes[i] = mesh;

      // Pinch = select (Quest hand tracking emits “selectstart” on pinch)
      hand.addEventListener("selectstart", () => {
        const info = this._getIndexTip(hand);
        if (this.onPinch && info) this.onPinch({ handedness: this._guessHandedness(hand), ...info });
      });
    }
  }

  _guessHandedness(hand) {
    // Heuristic: if the XR inputSource exists we can map handedness; otherwise label by index
    // In practice, this is “good enough” to differentiate behaviors.
    if (hand.name.includes("_0")) return "left";
    if (hand.name.includes("_1")) return "right";
    return "unknown";
  }

  _getIndexTip(hand) {
    // Use WebXR Hand joint API through Three.js hand.joints
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
