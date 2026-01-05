// js/interactions.js — Scarlett Poker VR (6.2) FIX2
// Fixes "laser stuck on table" by:
// 1) Ensuring rays live ONLY on controllers (never left behind in scene)
// 2) Purging any stray xr-ray Lines from the scene at init
// 3) Using left controller ray as the single pointer
// 4) Using GRIP (squeeze) as the action button
//
// Requires: js/state.js (registerInteractable, getInteractablesArray, activateObject)

import * as THREE from "three";
import { getInteractablesArray, activateObject } from "./state.js";

export const Interactions = {
  renderer: null,
  scene: null,
  camera: null,

  // Left controller pointer
  ctrlL: null,

  raycaster: new THREE.Raycaster(),
  _tmpMatrix: new THREE.Matrix4(),

  // Visual pointer dot
  pointerDot: null,
  pointerActive: false,

  // Hover state
  hovered: null,
  hoveredHit: null,

  init(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // ✅ Purge any stray rays already sitting in the scene (the "stuck on table" bug)
    this.purgeStrayRays();

    // Controller 0 is usually left on Quest (handedness can swap depending on runtime)
    this.ctrlL = renderer.xr.getController(0);
    if (!this.ctrlL) {
      console.warn("[Interactions] No XR controller(0) yet. Pointer will activate once XR session starts.");
    } else {
      // Ensure the ray exists ONLY on the controller
      this.ensureControllerRay(this.ctrlL);

      // Use grip as action button: squeezestart fires on grip for most XR devices
      this.ctrlL.addEventListener("squeezestart", this.onAction);
      // Trigger can be a fallback action too (optional)
      this.ctrlL.addEventListener("selectstart", this.onSelect);
    }

    // Pointer dot (shows hit point)
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
    this.scene.add(this.pointerDot);

    // If XR session starts later, re-attach cleanly
    renderer.xr.addEventListener("sessionstart", () => {
      this.purgeStrayRays();
      this.ctrlL = renderer.xr.getController(0);
      if (this.ctrlL) {
        this.ensureControllerRay(this.ctrlL);
        this.ctrlL.addEventListener("squeezestart", this.onAction);
        this.ctrlL.addEventListener("selectstart", this.onSelect);
      }
    });

    renderer.xr.addEventListener("sessionend", () => {
      this.pointerDot.visible = false;
      this.hovered = null;
      this.hoveredHit = null;
    });
  },

  // --- FIX CORE: kill stray rays in scene ---
  purgeStrayRays() {
    const toRemove = [];
    this.scene.traverse((o) => {
      // Stray ray: a Line named xr-ray that isn't parented to a controller
      if (o?.type === "Line" && o.name === "xr-ray") {
        const p = o.parent;
        const isController = p && (p.type === "Group" || p.type === "Object3D") && (p.userData?.isController === true);
        // Most controllers won't have isController flag, so we use another check:
        // If it's directly under scene or under a non-controller mesh/group, it's stray.
        if (!p || p === this.scene) toRemove.push(o);
      }
    });
    for (const o of toRemove) {
      try { this.scene.remove(o); } catch {}
    }
  },

  // Ensure a single ray exists on controller; never leave behind
  ensureControllerRay(controller) {
    // Mark controller so we can recognize it later if needed
    controller.userData.isController = true;

    // Remove any existing ray child (avoid duplicates)
    const old = controller.getObjectByName("xr-ray");
    if (old) controller.remove(old);

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2.4)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff55 });
    const line = new THREE.Line(geo, mat);
    line.name = "xr-ray";
    line.frustumCulled = false;
    controller.add(line);
  },

  // Action on GRIP
  onAction: (ev) => {
    // actual click handled in update() because we want latest hover target
    window.dispatchEvent(new CustomEvent("notify", { detail: { text: "Action (grip)!" } }));
  },

  // Optional fallback action on trigger
  onSelect: (ev) => {
    // click handled in update()
  },

  update(dt) {
    const session = this.renderer.xr.getSession();
    if (!session || !this.ctrlL) {
      this.pointerDot.visible = false;
      return;
    }

    // Keep ray on controller only (safety, also fixes any weird detach)
    if (!this.ctrlL.getObjectByName("xr-ray")) this.ensureControllerRay(this.ctrlL);

    // Ray origin/direction from controller matrix
    this._tmpMatrix.identity().extractRotation(this.ctrlL.matrixWorld);

    const rayOrigin = new THREE.Vector3().setFromMatrixPosition(this.ctrlL.matrixWorld);
    const rayDir = new THREE.Vector3(0, 0, -1).applyMatrix4(this._tmpMatrix).normalize();

    this.raycaster.ray.origin.copy(rayOrigin);
    this.raycaster.ray.direction.copy(rayDir);

    // Only raycast against registered interactables
    const targets = getInteractablesArray();
    const hits = this.raycaster.intersectObjects(targets, true);

    if (hits.length) {
      const hit = hits[0];
      this.pointerDot.visible = true;
      this.pointerDot.position.copy(hit.point);

      // Determine the registered root object (may be a child mesh)
      let root = hit.object;
      while (root && !root.userData.__interactable && root.parent) root = root.parent;

      this.hoveredHit = hit;
      this.setHovered(root || hit.object);
    } else {
      this.pointerDot.visible = false;
      this.hoveredHit = null;
      this.setHovered(null);
    }

    // Read input: fire action on grip press (button edge)
    // WebXR doesn't expose gamepad events reliably in all browsers, so we edge-detect here.
    this.handleGamepadClick(session);
  },

  _prevGrip: false,
  _prevTrigger: false,

  handleGamepadClick(session) {
    const srcs = session.inputSources || [];
    let leftGp = null;

    for (const s of srcs) {
      if (s.handedness === "left" && s.gamepad) leftGp = s.gamepad;
    }
    if (!leftGp) return;

    // Common mapping:
    // buttons[1] = grip (often), buttons[0] = trigger (often)
    const grip = !!leftGp.buttons?.[1]?.pressed;
    const trigger = !!leftGp.buttons?.[0]?.pressed;

    const gripDown = grip && !this._prevGrip;
    const triggerDown = trigger && !this._prevTrigger;

    this._prevGrip = grip;
    this._prevTrigger = trigger;

    // Prefer GRIP as action
    if (gripDown || triggerDown) {
      if (this.hovered) {
        const ok = activateObject(this.hovered);
        if (!ok) {
          window.dispatchEvent(new CustomEvent("notify", { detail: { text: "Nothing to interact with." } }));
        }
      }
    }
  },

  setHovered(obj) {
    if (this.hovered === obj) return;

    // Unhighlight previous
    if (this.hovered) this.setHighlight(this.hovered, false);

    this.hovered = obj;

    // Highlight new
    if (this.hovered) this.setHighlight(this.hovered, true);
  },

  setHighlight(obj, on) {
    // Lightweight highlight: emissive boost for meshes under obj
    obj.traverse?.((child) => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (!mat) return;

      // Store original emissive intensity once
      if (mat.emissive && mat.userData?.__hi == null) {
        mat.userData.__hi = mat.emissiveIntensity ?? 0;
      }

      if (mat.emissive) {
        mat.emissive = mat.emissive || new THREE.Color(0x000000);
        mat.emissiveIntensity = on ? Math.max(0.35, mat.userData.__hi || 0) : (mat.userData.__hi || 0);
      }
    });
  }
};
