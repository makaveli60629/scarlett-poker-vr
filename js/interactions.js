import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/**
 * interactions.js (GitHub Pages safe)
 * - Exports Interactions object with init(ctx) + update(dt, ctx)
 * - Raycaster-based "laser pointer" interaction
 * - Provides ctx.api.interactions.pick() and basic click events
 */

export const Interactions = {
  init(ctx) {
    this.ctx = ctx;

    this.raycaster = new THREE.Raycaster();
    this.tmpMat = new THREE.Matrix4();

    // targets array (you can push meshes into this from table/store/etc)
    ctx.interactables = ctx.interactables || [];

    // Simple event bus
    ctx.events = ctx.events || {};
    ctx.on = (name, fn) => {
      ctx.events[name] = ctx.events[name] || [];
      ctx.events[name].push(fn);
    };
    ctx.emit = (name, data) => {
      (ctx.events[name] || []).forEach((fn) => {
        try { fn(data); } catch {}
      });
    };

    // Helper: add interactable
    ctx.addInteractable = (mesh, meta = {}) => {
      mesh.userData.__interactable = true;
      mesh.userData.__meta = meta;
      ctx.interactables.push(mesh);
      return mesh;
    };

    // Helper: remove interactable
    ctx.removeInteractable = (mesh) => {
      ctx.interactables = (ctx.interactables || []).filter((m) => m !== mesh);
    };

    // Pick function
    ctx.api = ctx.api || {};
    ctx.api.interactions = ctx.api.interactions || {};
    ctx.api.interactions.pick = (controller) => this.pick(controller);

    // Controller trigger "select"
    const c0 = ctx.renderer.xr.getController(0);
    const c1 = ctx.renderer.xr.getController(1);

    const onSelect = (e) => {
      const controller = e.target;
      const hit = this.pick(controller);
      if (hit) {
        ctx.emit("interact", { hit, controller });
        // Also emit by type if provided
        const t = hit.object?.userData?.__meta?.type;
        if (t) ctx.emit(`interact:${t}`, { hit, controller });
      }
    };

    c0.addEventListener("select", onSelect);
    c1.addEventListener("select", onSelect);

    // Status
    ctx.api.interactions.ready = true;
    return this;
  },

  pick(controller) {
    const ctx = this.ctx;
    if (!ctx || !controller) return null;

    // controller matrixWorld -> ray origin + direction
    this.tmpMat.identity().extractRotation(controller.matrixWorld);

    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tmpMat).normalize();

    this.raycaster.set(origin, direction);
    this.raycaster.far = 12;

    const targets = (ctx.interactables || []).filter(Boolean);
    if (!targets.length) return null;

    const hits = this.raycaster.intersectObjects(targets, true);
    return hits && hits.length ? hits[0] : null;
  },

  update(dt, ctx) {
    // nothing heavy here yet (laser visuals handled in hands.js)
  },
};

export default Interactions;
