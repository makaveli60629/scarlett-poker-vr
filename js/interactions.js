// js/interactions.js — Patch 6.5
// Grip-based raycast interactions + pickup/drop + kiosk buy interaction.
// Works in VR + phone (uses camera forward ray).
//
// Integrates with:
// - Input.gripPressed()
// - Inventory
// - ShopUI
// - EventChip (must expose group or mesh via EventChip.group / EventChip.getObject())
// - StoreKiosk (must expose group/mesh via StoreKiosk.group / StoreKiosk.getObject())
//
// If your chip/kiosk modules don't expose objects, this file still works if you pass
// explicit objects into Interactions.setTargets() from main.js.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { Inventory } from "./inventory.js";
import { ShopUI } from "./shop_ui.js";

const _raycaster = new THREE.Raycaster();
const _tmpVec = new THREE.Vector3();
const _tmpVec2 = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();

function getWorldForward(obj, out = new THREE.Vector3()) {
  obj.getWorldQuaternion(_tmpQuat);
  out.set(0, 0, -1).applyQuaternion(_tmpQuat).normalize();
  return out;
}

function tryGetObject(mod) {
  if (!mod) return null;
  if (mod.getObject) return mod.getObject();
  if (mod.object) return mod.object;
  if (mod.group) return mod.group;
  if (mod.mesh) return mod.mesh;
  return null;
}

export const Interactions = {
  scene: null,
  camera: null,
  playerRig: null,

  // interaction targets
  kioskObj: null,
  chipObj: null,
  extraTargets: [],

  // held item
  held: null,
  heldOffset: new THREE.Vector3(0.18, -0.12, -0.38), // in camera space
  holdSmoothing: 0.18,

  // hover indicator
  hover: null,
  hoverMat: null,

  // options
  maxDistance: 5.0,
  enabled: true,

  init(scene, camera, playerRig, { kioskObj, chipObj, targets = [] } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.playerRig = playerRig;

    this.kioskObj = kioskObj || null;
    this.chipObj = chipObj || null;
    this.extraTargets = Array.isArray(targets) ? targets : [];

    // Hover ring
    this.hoverMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    this.hover = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 10, 22), this.hoverMat);
    this.hover.rotation.x = Math.PI / 2;
    this.hover.visible = false;
    this.scene.add(this.hover);
  },

  setTargets({ kioskObj, chipObj, targets = [] } = {}) {
    if (kioskObj) this.kioskObj = kioskObj;
    if (chipObj) this.chipObj = chipObj;
    if (Array.isArray(targets)) this.extraTargets = targets;
  },

  _rayFromCamera() {
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);

    const dir = getWorldForward(this.camera, new THREE.Vector3());

    _raycaster.set(origin, dir);
    _raycaster.far = this.maxDistance;
  },

  _collectMeshes(root, out = []) {
    if (!root) return out;
    root.traverse?.((o) => {
      if (o && o.isMesh) out.push(o);
    });
    return out;
  },

  _getInteractables() {
    const list = [];

    if (this.kioskObj) list.push({ type: "kiosk", obj: this.kioskObj });
    if (this.chipObj) list.push({ type: "chip", obj: this.chipObj });

    for (const t of this.extraTargets) {
      if (!t) continue;
      list.push({ type: t.userData?.kind || "prop", obj: t });
    }

    return list;
  },

  _pickHit() {
    this._rayFromCamera();

    const candidates = this._getInteractables();
    const meshes = [];
    const meshToType = new Map();

    for (const c of candidates) {
      const localMeshes = [];
      this._collectMeshes(c.obj, localMeshes);
      for (const m of localMeshes) {
        meshes.push(m);
        meshToType.set(m, c.type);
      }
    }

    if (meshes.length === 0) return null;

    const hits = _raycaster.intersectObjects(meshes, true);
    if (!hits || hits.length === 0) return null;

    const hit = hits[0];
    const type = meshToType.get(hit.object) || "prop";

    // find root object that we registered (kioskObj/chipObj/etc.)
    let root = hit.object;
    while (root && root.parent && root.parent !== this.scene) {
      // stop if this matches our known target root
      if (this.kioskObj && root === this.kioskObj) break;
      if (this.chipObj && root === this.chipObj) break;
      root = root.parent;
    }

    // try to resolve to correct root
    const resolveRoot = (obj) => {
      if (!obj) return obj;
      // if hit belongs under kiosk root, return kiosk root
      if (this.kioskObj && (this.kioskObj === obj || this.kioskObj.children?.includes(obj))) return this.kioskObj;
      if (this.chipObj && (this.chipObj === obj || this.chipObj.children?.includes(obj))) return this.chipObj;

      // check ancestry
      let p = hit.object;
      while (p) {
        if (this.kioskObj && p === this.kioskObj) return this.kioskObj;
        if (this.chipObj && p === this.chipObj) return this.chipObj;
        p = p.parent;
      }
      return obj;
    };

    const rootObj = resolveRoot(root);

    return { type, root: rootObj, point: hit.point, distance: hit.distance };
  },

  _setHover(hit) {
    if (!this.hover) return;

    if (!hit) {
      this.hover.visible = false;
      return;
    }

    this.hover.visible = true;
    this.hover.position.copy(hit.point);
    this.hover.position.y += 0.03;

    // size hover based on type
    const s = hit.type === "kiosk" ? 1.2 : hit.type === "chip" ? 0.9 : 1.0;
    this.hover.scale.setScalar(s);
  },

  _holdAttach(obj) {
    if (!obj || !this.camera) return;

    // Detach from current parent but keep world transform
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(_tmpVec);
    obj.getWorldQuaternion(_tmpQuat);

    this.scene.attach(obj);
    obj.position.copy(_tmpVec);
    obj.quaternion.copy(_tmpQuat);

    this.held = obj;

    // mark
    if (!this.held.userData) this.held.userData = {};
    this.held.userData.__held = true;
  },

  _holdRelease() {
    if (!this.held) return;
    if (this.held.userData) this.held.userData.__held = false;
    this.held = null;
  },

  _updateHeld(dt) {
    if (!this.held || !this.camera) return;

    // Desired hold position in front of camera
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    const forward = getWorldForward(this.camera, new THREE.Vector3());
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    const desired = new THREE.Vector3()
      .copy(camPos)
      .addScaledVector(right, this.heldOffset.x)
      .addScaledVector(up, this.heldOffset.y)
      .addScaledVector(forward, this.heldOffset.z);

    // Smooth
    this.held.position.lerp(desired, 1 - Math.pow(1 - this.holdSmoothing, dt * 60));

    // Make it face camera slightly
    const yaw = Math.atan2(forward.x, forward.z) + Math.PI;
    this.held.rotation.set(0, yaw, 0);
  },

  // Called from main.js when grip pressed
  onGrip(toast) {
    if (!this.enabled) return;

    // If holding something, drop it
    if (this.held) {
      toast?.("Dropped");
      this._holdRelease();
      return;
    }

    // Otherwise pick from ray
    const hit = this._pickHit();
    if (!hit) return toast?.("Nothing to interact with");

    if (hit.type === "kiosk") {
      ShopUI.toggle();
      return toast?.(ShopUI.open ? "Store opened" : "Store closed");
    }

    if (hit.type === "chip") {
      this._holdAttach(hit.root);
      // reward a tiny amount for picking up (optional feel-good)
      Inventory.addChips(25);
      ShopUI.render?.();
      return toast?.("Picked up Event Chip (+25 chips)");
    }

    // generic interact
    toast?.("Interacted");
  },

  update(dt) {
    if (!this.enabled) return;

    // Hover feedback (not while holding)
    if (!this.held) {
      const hit = this._pickHit();
      this._setHover(hit);
    } else {
      this.hover.visible = false;
    }

    // Update held item follow
    this._updateHeld(dt);
  }
};
