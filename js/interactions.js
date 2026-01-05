import * as THREE from "three";
import { getInteractablesArray, activateObject } from "./state.js";

export const Interactions = {
  renderer: null,
  scene: null,
  camera: null,
  ctrlL: null,

  raycaster: new THREE.Raycaster(),
  _tmpMatrix: new THREE.Matrix4(),

  pointerDot: null,
  hovered: null,

  _prevGrip: false,
  _prevTrigger: false,

  // We keep a short-time janitor active to delete any old leftover rays
  _janitorTime: 6.0,

  init(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Create pointer dot
    this.pointerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.0,
        roughness: 0.3
      })
    );
    this.pointerDot.visible = false;
    this.pointerDot.frustumCulled = false;
    scene.add(this.pointerDot);

    // Start cleanup immediately
    this.purgeStrayRays(true);

    renderer.xr.addEventListener("sessionstart", () => {
      this.ctrlL = renderer.xr.getController(0);
      if (this.ctrlL) {
        this.ctrlL.userData.isController = true;
        this.ensureRay(this.ctrlL);
      }
      this._janitorTime = 6.0;
      this.purgeStrayRays(true);
    });

    renderer.xr.addEventListener("sessionend", () => {
      this.pointerDot.visible = false;
      this.hovered = null;
    });
  },

  ensureRay(controller) {
    // Remove any previous ray under this controller
    const old = controller.getObjectByName("pointer-ray");
    if (old) controller.remove(old);

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2.6)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff55 });
    const line = new THREE.Line(geo, mat);
    line.name = "pointer-ray";
    line.frustumCulled = false;
    controller.add(line);
  },

  // Strong purge:
  // - Removes any Line objects not attached to controllers
  // - Also removes any line sitting near table area (|x|<8 && |z|<8) as "leftover"
  purgeStrayRays(aggressive = false) {
    const toRemove = [];
    this.scene.traverse((o) => {
      if (!o) return;

      // Only care about Line objects (laser leftovers)
      if (o.type !== "Line") return;

      // Keep our legitimate controller ray
      if (o.name === "pointer-ray") return;

      // If attached to a controller, keep it
      const p = o.parent;
      const isUnderController = !!(p && p.userData && p.userData.isController);
      if (isUnderController) return;

      // If it's directly in the world and near the table center, remove it
      const wp = new THREE.Vector3();
      o.getWorldPosition(wp);

      const nearTable = Math.abs(wp.x) < 8 && Math.abs(wp.z) < 8 && wp.y < 3.0;
      if (nearTable || aggressive) toRemove.push(o);
    });

    for (const o of toRemove) {
      try { o.parent?.remove(o); } catch {}
      try { this.scene.remove(o); } catch {}
    }
  },

  update(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) {
      this.pointerDot.visible = false;
      return;
    }

    // Keep deleting leftovers for a few seconds (catches cached/old objects)
    if (this._janitorTime > 0) {
      this._janitorTime -= dt;
      this.purgeStrayRays(false);
    }

    // Ensure controller & ray exist
    if (!this.ctrlL) this.ctrlL = this.renderer.xr.getController(0);
    if (!this.ctrlL) return;

    this.ctrlL.userData.isController = true;
    if (!this.ctrlL.getObjectByName("pointer-ray")) this.ensureRay(this.ctrlL);

    // Ray from controller
    this._tmpMatrix.identity().extractRotation(this.ctrlL.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(this.ctrlL.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(this._tmpMatrix).normalize();

    this.raycaster.ray.origin.copy(origin);
    this.raycaster.ray.direction.copy(dir);

    const targets = getInteractablesArray();
    const hits = this.raycaster.intersectObjects(targets, true);

    if (hits.length) {
      const hit = hits[0];
      this.pointerDot.visible = true;
      this.pointerDot.position.copy(hit.point);

      let root = hit.object;
      while (root && !root.userData.__interactable && root.parent) root = root.parent;
      this.hovered = root || hit.object;
    } else {
      this.pointerDot.visible = false;
      this.hovered = null;
    }

    // Click with grip or trigger (left hand)
    this.handleClick(session);
  },

  handleClick(session) {
    const srcs = session.inputSources || [];
    let leftGp = null;
    for (const s of srcs) {
      if (s.handedness === "left" && s.gamepad) leftGp = s.gamepad;
    }
    if (!leftGp) return;

    const grip = !!leftGp.buttons?.[1]?.pressed;
    const trigger = !!leftGp.buttons?.[0]?.pressed;

    const gripDown = grip && !this._prevGrip;
    const trigDown = trigger && !this._prevTrigger;

    this._prevGrip = grip;
    this._prevTrigger = trigger;

    if ((gripDown || trigDown) && this.hovered) {
      activateObject(this.hovered);
    }
  }
};
