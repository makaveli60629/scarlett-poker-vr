import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/**
 * hands.js (GitHub Pages safe)
 * - Exports Hands object with init(ctx) + update(dt, ctx)
 * - Adds controller laser + hit reticle
 * - Works with Interactions (if present) but doesn't require it
 */

export const Hands = {
  init(ctx) {
    this.ctx = ctx;

    // controllers
    this.c0 = ctx.renderer.xr.getController(0);
    this.c1 = ctx.renderer.xr.getController(1);

    // build lasers
    this.l0 = this._makeLaser();
    this.l1 = this._makeLaser();
    this.c0.add(this.l0.group);
    this.c1.add(this.l1.group);

    // reticles
    this.r0 = this._makeReticle();
    this.r1 = this._makeReticle();
    ctx.scene.add(this.r0);
    ctx.scene.add(this.r1);

    // hide by default until we have a hit
    this.r0.visible = false;
    this.r1.visible = false;

    ctx.api = ctx.api || {};
    ctx.api.hands = this;

    return this;
  },

  _makeLaser() {
    const group = new THREE.Group();

    // beam
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
    const line = new THREE.Line(geom, mat);
    line.name = "laserLine";
    line.scale.z = 10; // default length
    group.add(line);

    // tip glow
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    tip.position.z = -10;
    group.add(tip);

    return { group, line, tip };
  },

  _makeReticle() {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.028, 24),
      new THREE.MeshBasicMaterial({ color: 0x44ff99, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  },

  update(dt, ctx) {
    // If interactions exists, use it for hit tests
    const pick = ctx.api?.interactions?.pick;

    this._updateOne(ctx, this.c0, this.l0, this.r0, pick);
    this._updateOne(ctx, this.c1, this.l1, this.r1, pick);
  },

  _updateOne(ctx, controller, laser, reticle, pick) {
    if (!controller) return;

    let hit = null;

    if (typeof pick === "function") {
      hit = pick(controller);
    }

    // laser length
    const length = hit ? Math.max(0.4, Math.min(10, hit.distance)) : 10;
    laser.line.scale.z = length;
    laser.tip.position.z = -length;

    // reticle
    if (hit) {
      reticle.visible = true;
      reticle.position.copy(hit.point);

      // face the camera a bit (simple)
      reticle.lookAt(ctx.camera.position);
    } else {
      reticle.visible = false;
    }
  },
};

export default Hands;
