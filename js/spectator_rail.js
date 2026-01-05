// js/spectator_rail.js
// VIP Spectator Rail — safe, lightweight, no-crash implementation

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const SpectatorRail = {
  group: null,
  enabled: true,

  build(scene, center = new THREE.Vector3(0, 0, 0), radius = 4.0, opts = {}) {
    try {
      if (!scene) return null;

      // If already built, dispose then rebuild
      if (this.group) {
        this.dispose(scene);
      }

      const postCount = Math.max(8, opts.postCount ?? 18);
      const postHeight = opts.postHeight ?? 1.1;
      const postRadius = opts.postRadius ?? 0.035;
      const railRadius = opts.railRadius ?? 0.02;

      const g = new THREE.Group();
      g.name = "SpectatorRail";
      g.position.copy(center);

      const postMat = new THREE.MeshStandardMaterial({
        color: 0x121318,
        roughness: 0.85,
        metalness: 0.25,
        emissive: 0x05060a,
        emissiveIntensity: 0.35,
      });

      const railMat = new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        roughness: 0.3,
        metalness: 0.35,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.9,
      });

      // Posts
      for (let i = 0; i < postCount; i++) {
        const a = (i / postCount) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;

        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 12),
          postMat
        );
        post.position.set(x, postHeight / 2, z);
        post.castShadow = false;
        post.receiveShadow = false;
        g.add(post);
      }

      // Simple ring rails (two torus rings)
      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(radius, railRadius, 10, 120),
        railMat
      );
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = postHeight * 0.72;
      g.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(radius, railRadius, 10, 120),
        railMat
      );
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = postHeight * 0.42;
      g.add(ring2);

      this.group = g;
      this.setEnabled(true);

      scene.add(g);
      return g;
    } catch (e) {
      console.warn("SpectatorRail.build error:", e);
      return null;
    }
  },

  update(dt) {
    // Optional: subtle pulsing emissive could go here later (safe no-op for now)
    void dt;
  },

  setEnabled(v) {
    this.enabled = !!v;
    if (this.group) this.group.visible = this.enabled;
  },

  dispose(scene) {
    try {
      if (!this.group) return;
      if (scene) scene.remove(this.group);

      // Dispose geometries/materials
      this.group.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
            else obj.material.dispose?.();
          }
        }
      });

      this.group = null;
    } catch (e) {
      console.warn("SpectatorRail.dispose error:", e);
    }
  },
};
