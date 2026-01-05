// js/water_fountain.js — Animated lobby fountain (GitHub-safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const WaterFountain = {
  group: null,
  water: null,
  t: 0,

  build(scene, pos = { x: 0, y: 0, z: 9.0 }) {
    this.group = new THREE.Group();
    this.group.name = "WaterFountain";
    this.group.position.set(pos.x, pos.y, pos.z);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x1b1f24,
      roughness: 0.9,
      metalness: 0.05,
      emissive: 0x001015,
      emissiveIntensity: 0.25
    });

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.10, 0.45, 28), stoneMat);
    bowl.position.y = 0.22;

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.90, 0.32, 28), stoneMat);
    inner.position.y = 0.26;

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.75, 18), stoneMat);
    pillar.position.y = 0.65;

    const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), stoneMat);
    top.position.y = 1.08;

    // Water disk (animated emissive shimmer)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0b2a33,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      emissive: 0x006b7a,
      emissiveIntensity: 0.45
    });
    this.water = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0.40;

    // Water jet
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0x8feaff,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.9
    });
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 14), jetMat);
    jet.position.y = 1.05;

    // Glow
    const glow = new THREE.PointLight(0x00ffaa, 0.45, 7);
    glow.position.set(0, 1.45, 0);

    // Base ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.06, 10, 44),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;

    this.group.add(bowl, inner, pillar, top, this.water, jet, ring, glow);
    scene.add(this.group);
    return this.group;
  },

  update(dt) {
    if (!this.group || !this.water) return;
    this.t += dt;

    // gentle bob + shimmer
    this.water.material.emissiveIntensity = 0.35 + Math.sin(this.t * 2.0) * 0.12;
    this.water.material.opacity = 0.88 + Math.sin(this.t * 1.3) * 0.04;
    this.water.rotation.z = Math.sin(this.t * 0.35) * 0.06;
  }
};
