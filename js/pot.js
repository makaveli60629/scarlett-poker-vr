// js/pot.js — Pot + chip visuals (GitHub-safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Pot = {
  group: null,
  potValue: 0,
  _chipCount: 0,

  build(scene, position) {
    this.group = new THREE.Group();
    this.group.name = "PotGroup";
    this.group.position.copy(position);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.08, 18),
      new THREE.MeshStandardMaterial({
        color: 0x121212,
        roughness: 0.75,
        emissive: 0x001a12,
        emissiveIntensity: 0.45
      })
    );
    pedestal.position.y = 0.02;

    const glow = new THREE.PointLight(0x00ffaa, 0.35, 6);
    glow.position.set(0, 0.8, 0);

    this.group.add(pedestal, glow);
    scene.add(this.group);
    return this.group;
  },

  reset() {
    this.potValue = 0;
    this._chipCount = 0;
    if (!this.group) return;
    // remove old chip meshes
    const keep = this.group.children.filter(c => c.type === "PointLight" || c.geometry?.type === "CylinderGeometry");
    this.group.children = keep;
  },

  add(amount) {
    this.potValue += amount;

    // Add chips occasionally (not every bet)
    const targetChips = Math.min(40, Math.floor(this.potValue / 250));
    while (this._chipCount < targetChips) {
      this._chipCount++;
      this._spawnChip();
    }
  },

  _spawnChip() {
    if (!this.group) return;
    const chip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.018, 18),
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.55,
        metalness: 0.25,
        emissive: 0x002014,
        emissiveIntensity: 0.12
      })
    );

    const layer = Math.floor((this._chipCount - 1) / 10);
    const idx = (this._chipCount - 1) % 10;

    const angle = (idx / 10) * Math.PI * 2;
    const radius = 0.14 + layer * 0.03;

    chip.position.set(Math.sin(angle) * radius, 0.06 + layer * 0.02, Math.cos(angle) * radius);
    chip.rotation.y = angle;

    this.group.add(chip);
  }
};
