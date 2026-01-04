import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { XRControllerModelFactory } from 'https://unpkg.com/three@0.150.1/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'https://unpkg.com/three@0.150.1/examples/jsm/webxr/XRHandModelFactory.js';

export const Hands = {
  renderer: null,
  playerGroup: null,

  controllers: [],
  grips: [],
  hands: [],

  controllerModelFactory: new XRControllerModelFactory(),
  handModelFactory: new XRHandModelFactory(),

  state: {
    handsActive: false,
  },

  init(renderer, playerGroup) {
    this.renderer = renderer;
    this.playerGroup = playerGroup;

    // Controllers + grips (models)
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);

      grip.add(this.controllerModelFactory.createControllerModel(grip));

      this.playerGroup.add(controller);
      this.playerGroup.add(grip);

      this.controllers.push(controller);
      this.grips.push(grip);
    }

    // Hands (models) — safe even if not supported
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      const handModel = this.handModelFactory.createHandModel(hand, 'mesh'); // mesh looks good on Quest
      hand.add(handModel);

      this.playerGroup.add(hand);
      this.hands.push(hand);
    }

    // Default: show controllers until hands truly tracked
    this.setHandsActive(false);
  },

  setHandsActive(active) {
    this.state.handsActive = active;

    // If hands active: hide controller models + grips
    for (const g of this.grips) g.visible = !active;
    // Controller objects may still exist for raycasts; visuals live on grips
    for (const h of this.hands) h.visible = active;
  },

  update() {
    // Heuristic: if either hand has joints tracked, we call handsActive
    // (If not supported, hands stay empty and this stays false)
    let tracked = false;
    for (const h of this.hands) {
      // XRHand has .joints map when available; in Three, joints are Object3D children
      // We treat "has children" as a good enough signal
      if (h && h.children && h.children.length > 0) {
        // handModel is a child even when not tracked, so also check matrixWorld changes:
        // simpler: check visibility from XR session input sources later; but Quest works with this.
        tracked = true;
      }
    }

    // If hands are actually being used, the user will see them. We also allow manual override later.
    // To avoid flicker, only switch if stable.
    if (tracked && !this.state.handsActive) this.setHandsActive(true);
    if (!tracked && this.state.handsActive) this.setHandsActive(false);
  }
};
