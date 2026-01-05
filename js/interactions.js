// js/interactions.js — Patch 7.2 FULL
// Now: Grip will click the VR menu when it's open (VIP buttons work).
// Also keeps: pickup/drop chip and kiosk toast.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRUIPanel } from "./vr_ui_panel.js";

export const Interactions = {
  scene: null,
  camera: null,
  rig: null,

  kioskObj: null,
  chipObj: null,

  held: null,

  init(scene, camera, playerRig, { kioskObj, chipObj } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.rig = playerRig;
    this.kioskObj = kioskObj || null;
    this.chipObj = chipObj || null;
    this.held = null;
  },

  onGrip(toast) {
    // 1) If menu open, click it
    if (VRUIPanel?.visible) {
      const clicked = VRUIPanel.click();
      if (clicked) return;
    }

    // 2) pickup/drop chip
    if (!this.rig) return;

    const rigPos = new THREE.Vector3();
    this.rig.getWorldPosition(rigPos);

    if (!this.held && this.chipObj) {
      const chipPos = new THREE.Vector3();
      this.chipObj.getWorldPosition(chipPos);

      if (chipPos.distanceTo(rigPos) < 1.25) {
        this.held = this.chipObj;
        toast?.("Picked up Event Chip");
        return;
      }
    }

    if (this.held) {
      this.held = null;
      toast?.("Dropped");
      return;
    }

    // 3) kiosk hint
    if (this.kioskObj) {
      const kPos = new THREE.Vector3();
      this.kioskObj.getWorldPosition(kPos);
      if (kPos.distanceTo(rigPos) < 1.8) {
        toast?.("Kiosk: Open VR Menu (Menu button)");
      }
    }
  },

  update(dt) {
    if (!this.held || !this.camera) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    const target = camPos.clone().add(forward.multiplyScalar(0.55));
    target.y -= 0.15;

    this.held.position.copy(target);
  }
};
