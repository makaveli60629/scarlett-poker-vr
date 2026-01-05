import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const XrLocomotion = {
  init(ctx) {
    this.ctx = ctx;
    this.enabled = true;

    // Teleport-only (no motion sickness)
    this.snapTurnDeg = 45;

    // Controllers
    this.left = ctx.renderer.xr.getController(0);
    this.right = ctx.renderer.xr.getController(1);

    // Visuals
    this.arcLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x44ccff })
    );
    this.arcLine.frustumCulled = false;
    ctx.scene.add(this.arcLine);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.34, 40),
      new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0.95 })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    ctx.scene.add(this.ring);

    // Raycast helpers
    this.ray = new THREE.Raycaster();
    this.tmpMat = new THREE.Matrix4();
    this.tmpDir = new THREE.Vector3();
    this.tmpPos = new THREE.Vector3();

    // Arc sampling
    this.arcPoints = Array.from({ length: 26 }, () => new THREE.Vector3());
    this.arcGeom = new THREE.BufferGeometry().setFromPoints(this.arcPoints);
    this.arcLine.geometry = this.arcGeom;

    // State
    this.lastHit = null;
    this.lastTurn = 0;

    // Events: LEFT trigger teleport (select)
    const onSelectEnd = () => this.tryTeleport();
    this.left?.addEventListener("selectend", onSelectEnd);

    // Floors/colliders
    ctx.floorPlanes = ctx.floorPlanes || [];
    ctx.colliders = ctx.colliders || [];

    return this;
  },

  update(dt, ctx) {
    if (!this.enabled) return;

    // Teleport aim always from LEFT controller
    const hit = this.computeTeleportHit();
    if (hit) {
      this.ring.visible = true;
      this.ring.position.copy(hit);
      this.ring.position.y += 0.02;
    } else {
      this.ring.visible = false;
    }

    // Snap turn from RIGHT stick
    this.handleSnapTurn();
  },

  computeTeleportHit() {
    const ctx = this.ctx;
    const ctrl = this.left;
    if (!ctrl) return null;

    this.tmpMat.extractRotation(ctrl.matrixWorld);
    this.tmpDir.set(0, 0, -1).applyMatrix4(this.tmpMat).normalize();
    ctrl.getWorldPosition(this.tmpPos);

    this.ray.set(this.tmpPos, this.tmpDir);

    const floors = ctx.floorPlanes?.length ? ctx.floorPlanes : (ctx.colliders || []);
    if (!floors.length) {
      this.drawArc(null);
      return null;
    }

    const hits = this.ray.intersectObjects(floors, true);
    if (hits && hits.length) {
      const p = hits[0].point.clone();
      this.drawArc(p);
      this.lastHit = p;
      return p;
    }

    this.drawArc(null);
    this.lastHit = null;
    return null;
  },

  drawArc(hitPoint) {
    const ctrl = this.left;
    if (!ctrl) return;

    const start = new THREE.Vector3();
    ctrl.getWorldPosition(start);

    this.tmpMat.extractRotation(ctrl.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tmpMat).normalize();

    // Tighter arc (feels more responsive)
    const steps = this.arcPoints.length;
    const maxT = 0.9;
    const gravity = 7.5;
    const speed = 11.5;

    for (let i = 0; i < steps; i++) {
      const t = (i / (steps - 1)) * maxT;
      const p = this.arcPoints[i];
      p.copy(start)
        .addScaledVector(fwd, speed * t)
        .add(new THREE.Vector3(0, 1, 0).multiplyScalar((1.05 * t) - (0.5 * gravity * t * t)));

      if (hitPoint && i === steps - 1) p.copy(hitPoint).add(new THREE.Vector3(0, 0.02, 0));
    }

    this.arcGeom.setFromPoints(this.arcPoints);
    this.arcGeom.attributes.position.needsUpdate = true;
  },

  tryTeleport() {
    const ctx = this.ctx;
    if (!this.lastHit) return;

    const p = this.lastHit;
    ctx.rig.position.set(p.x, 0, p.z);

    if (ctx.api?.ui?.toast) ctx.api.ui.toast("Teleported");
  },

  handleSnapTurn() {
    const ctx = this.ctx;
    const session = ctx.renderer.xr.getSession?.();
    if (!session) return;

    let gp = null;
    for (const src of session.inputSources) {
      // prefer right-hand gamepad if available
      if (src.handedness === "right" && src.gamepad) { gp = src.gamepad; break; }
    }
    if (!gp) {
      for (const src of session.inputSources) {
        if (src.gamepad) { gp = src.gamepad; break; }
      }
    }
    if (!gp) return;

    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0; // right stick x or left stick x
    const now = performance.now();

    if (Math.abs(ax) < 0.65) return;
    if (now - this.lastTurn < 250) return;
    this.lastTurn = now;

    const dir = ax > 0 ? -1 : 1;
    ctx.rig.rotation.y += THREE.MathUtils.degToRad(this.snapTurnDeg * dir);
  },
};

export default XrLocomotion;
