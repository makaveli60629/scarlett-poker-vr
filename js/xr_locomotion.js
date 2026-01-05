import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const XrLocomotion = {
  init(ctx) {
    this.ctx = ctx;
    this.enabled = true;

    // Teleport-only by default (prevents motion sickness)
    this.allowSmooth = false;
    this.snapTurnDeg = 45;

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

    // Controller references
    this.c0 = ctx.renderer.xr.getController(0);
    this.c1 = ctx.renderer.xr.getController(1);

    // Teleport events (trigger/“pinch” equivalent)
    const onSelectStart = (e) => { this.teleportPressed = true; };
    const onSelectEnd   = (e) => { this.tryTeleport(); this.teleportPressed = false; };

    this.c0.addEventListener("selectstart", onSelectStart);
    this.c0.addEventListener("selectend", onSelectEnd);
    this.c1.addEventListener("selectstart", onSelectStart);
    this.c1.addEventListener("selectend", onSelectEnd);

    // Snap turn with thumbstick (safe + non-sick)
    this.lastTurn = 0;

    // Raycaster
    this.ray = new THREE.Raycaster();
    this.tmpMat = new THREE.Matrix4();
    this.tmpDir = new THREE.Vector3();
    this.tmpPos = new THREE.Vector3();

    // arc sampling
    this.arcPoints = Array.from({ length: 28 }, () => new THREE.Vector3());
    this.arcGeom = new THREE.BufferGeometry().setFromPoints(this.arcPoints);
    this.arcLine.geometry = this.arcGeom;

    // Make sure floors exist
    ctx.floorPlanes = ctx.floorPlanes || [];
    ctx.colliders = ctx.colliders || [];

    // Provide a hook so controls/menu can call it
    this.onMenuToggle = null;

    return this;
  },

  update(dt, ctx) {
    if (!this.enabled) return;

    // Update aim + reticle every frame
    const hit = this.computeTeleportHit();
    if (hit) {
      this.ring.visible = true;
      this.ring.position.copy(hit);
      this.ring.position.y += 0.02;
    } else {
      this.ring.visible = false;
    }

    // Snap turn (Quest thumbstick)
    this.handleSnapTurn(dt);
  },

  getActiveController() {
    // Prefer right controller if present
    return this.c1 || this.c0;
  },

  computeTeleportHit() {
    const ctx = this.ctx;
    const ctrl = this.getActiveController();
    if (!ctrl) return null;

    // Controller forward direction
    this.tmpMat.extractRotation(ctrl.matrixWorld);
    this.tmpDir.set(0, 0, -1).applyMatrix4(this.tmpMat).normalize();
    ctrl.getWorldPosition(this.tmpPos);

    // Cast ray down to floors (best: floorPlanes)
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
    const ctx = this.ctx;
    const ctrl = this.getActiveController();
    if (!ctrl) return;

    const start = new THREE.Vector3();
    ctrl.getWorldPosition(start);

    // Arc direction
    this.tmpMat.extractRotation(ctrl.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tmpMat).normalize();

    // Simple parabolic arc samples
    const steps = this.arcPoints.length;
    const maxT = 1.0;
    const gravity = 6.0;
    const speed = 12.0;

    for (let i = 0; i < steps; i++) {
      const t = (i / (steps - 1)) * maxT;
      const p = this.arcPoints[i];
      p.copy(start)
        .addScaledVector(fwd, speed * t)
        .addScaledVector(new THREE.Vector3(0, 1, 0), (1.2 * t) - (0.5 * gravity * t * t));

      // If we have a hit, clamp last point to it
      if (hitPoint && i === steps - 1) p.copy(hitPoint).add(new THREE.Vector3(0, 0.02, 0));
    }

    this.arcGeom.setFromPoints(this.arcPoints);
    this.arcGeom.attributes.position.needsUpdate = true;
  },

  tryTeleport() {
    const ctx = this.ctx;
    if (!this.lastHit) return;

    // Teleport moves the RIG (not the camera) — correct XR behavior
    const p = this.lastHit;
    ctx.rig.position.set(p.x, 0, p.z);

    // If UI exists, let it know (optional)
    if (ctx.api?.ui?.toast) ctx.api.ui.toast("Teleported");
  },

  handleSnapTurn(dt) {
    const ctx = this.ctx;
    const session = ctx.renderer.xr.getSession?.();
    if (!session) return;

    // Find a gamepad with axes
    let gp = null;
    for (const src of session.inputSources) {
      if (src.gamepad && src.gamepad.axes) { gp = src.gamepad; break; }
    }
    if (!gp) return;

    const ax = gp.axes[2] ?? gp.axes[0] ?? 0; // right stick x or left stick x
    const now = performance.now();

    // deadzone
    if (Math.abs(ax) < 0.6) return;

    // cooldown
    if (now - this.lastTurn < 250) return;
    this.lastTurn = now;

    const dir = ax > 0 ? -1 : 1;
    ctx.rig.rotation.y += THREE.MathUtils.degToRad(this.snapTurnDeg * dir);
  },
};

export default XrLocomotion;
