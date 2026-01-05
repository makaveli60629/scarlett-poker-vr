// js/spectator_rail.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const SpectatorRail = {
  group: null,
  enabled: true,

  build(scene, center, radius, opts = {}) {
    const postCount = opts.postCount ?? 20;

    this.group = new THREE.Group();
    this.group.name = "SpectatorRail";
    scene.add(this.group);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x001611,
      emissiveIntensity: 0.25,
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.3,
      roughness: 0.35,
    });

    // top ring glow
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.03, 10, 120),
      glowMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(center.x, 0.95, center.z);
    this.group.add(ring);

    // posts + mid rails
    for (let i = 0; i < postCount; i++) {
      const t = (i / postCount) * Math.PI * 2;
      const x = center.x + Math.cos(t) * radius;
      const z = center.z + Math.sin(t) * radius;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.95, 12),
        railMat
      );
      post.position.set(x, 0.47, z);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        glowMat
      );
      cap.position.set(x, 0.96, z);

      this.group.add(post, cap);
    }

    // low ring (dark)
    const low = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.02, 8, 120),
      railMat
    );
    low.rotation.x = Math.PI / 2;
    low.position.set(center.x, 0.45, center.z);
    this.group.add(low);

    return this.group;
  },

  update() {},

  setEnabled(v) {
    this.enabled = !!v;
    if (this.group) this.group.visible = this.enabled;
  },

  dispose() {
    if (this.group?.parent) this.group.parent.remove(this.group);
    this.group = null;
  },
};
