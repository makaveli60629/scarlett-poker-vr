// js/spectator_rail.js — VIP Rail Visual Builder (Safe + Real Geometry)
import * as THREE from "./three.js";

export const SpectatorRail = {
  group: null,

  build(scene, center, radius, opts = {}) {
    const postCount = opts.postCount ?? 20;

    this.group = new THREE.Group();
    this.group.name = "SpectatorRail";
    this.group.position.copy(center);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.85 });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.85,
      roughness: 0.35,
    });

    const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 10);
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 10);

    // Posts around circle
    for (let i = 0; i < postCount; i++) {
      const t = (i / postCount) * Math.PI * 2;
      const x = Math.cos(t) * radius;
      const z = Math.sin(t) * radius;

      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.5, z);
      this.group.add(post);
    }

    // Two glowing rings (top + mid)
    const ringTop = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.03, 10, 100),
      railMat
    );
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = 0.95;

    const ringMid = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.03, 10, 100),
      railMat
    );
    ringMid.rotation.x = Math.PI / 2;
    ringMid.position.y = 0.62;

    this.group.add(ringTop, ringMid);

    scene.add(this.group);
    return this.group;
  },

  update() {},
  setEnabled(on = true) { if (this.group) this.group.visible = !!on; },
  dispose() {
    if (!this.group) return;
    this.group.parent?.remove(this.group);
    this.group = null;
  },
};
