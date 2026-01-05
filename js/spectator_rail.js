// js/spectator_rail.js — stable rail ring

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const SpectatorRail = {
  group: null,

  build(scene, center, radius, opts = {}) {
    if (!scene) return null;
    if (this.group) { try { scene.remove(this.group); } catch {} this.group = null; }

    const postCount = Math.max(10, opts.postCount ?? 20);
    const postH = opts.postHeight ?? 1.1;

    const g = new THREE.Group();
    g.name = "SpectatorRail";
    g.position.copy(center);

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x141420,
      roughness: 0.9,
      metalness: 0.2,
      emissive: 0x05060a,
      emissiveIntensity: 0.35
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      roughness: 0.35,
      metalness: 0.35,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.85
    });

    for (let i = 0; i < postCount; i++) {
      const a = (i / postCount) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, postH, 12),
        postMat
      );
      post.position.set(x, postH / 2, z);
      g.add(post);
    }

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.02, 10, 120), railMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = postH * 0.72;

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.02, 10, 120), railMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = postH * 0.42;

    g.add(ring1, ring2);
    scene.add(g);

    this.group = g;
    return g;
  }
};
