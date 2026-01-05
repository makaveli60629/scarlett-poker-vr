// js/teleport_machine.js
// Teleport Machine + Safe Spawn provider (browser-safe, no TS syntax)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  group: null,
  pads: [],
  safeSpawn: new THREE.Vector3(0, 0, 3), // fallback if nothing else exists

  // Call from world.js (or main.js) to get a safe spawn position
  getSafeSpawn() {
    // Prefer first pad if we built pads
    if (this.pads && this.pads.length) {
      const p = this.pads[0].position.clone();
      p.y = Math.max(0.0, p.y) + 0.05;
      return p;
    }
    // Fallback
    return this.safeSpawn.clone();
  },

  build(scene, opts = {}) {
    // Create a group so the world can manage it
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";

    // Default position (center front-ish)
    const pos = opts.position || new THREE.Vector3(0, 0, 3);
    this.group.position.copy(pos);

    // --- Visual core (looks like a “machine” / fountain pedestal) ---
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 0.30, 28),
      new THREE.MeshStandardMaterial({ color: 0x101118, roughness: 0.95 })
    );
    base.position.y = 0.15;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.05, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.33;

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 18, 18),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 2.0,
        roughness: 0.2
      })
    );
    orb.position.y = 0.45;

    const glow = new THREE.PointLight(0x00ffaa, 0.8, 8);
    glow.position.set(0, 0.65, 0);

    this.group.add(base, ring, orb, glow);
    scene.add(this.group);

    // --- Teleport Pads (green balls / anchors) ---
    // If you already have 4 corner balls, this will match that vibe.
    // Pads are placed relative to world origin (not group), so they stay stable.
    this._buildPads(scene, opts.pads);

    // Update safe spawn to a pad if available
    if (this.pads.length) {
      const p = this.pads[0].position.clone();
      p.y = Math.max(0.0, p.y) + 0.05;
      this.safeSpawn.copy(p);
    } else {
      this.safeSpawn.set(0, 0, 3);
    }

    return this.group;
  },

  _buildPads(scene, padsOverride) {
    // Remove previous pads if hot-reloading
    this.disposePads(scene);

    const padPositions = padsOverride || [
      new THREE.Vector3(-6.2, 0.12, -6.2),
      new THREE.Vector3( 6.2, 0.12, -6.2),
      new THREE.Vector3(-6.2, 0.12,  6.2),
      new THREE.Vector3( 6.2, 0.12,  6.2),
    ];

    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.6,
      roughness: 0.25
    });

    for (let i = 0; i < padPositions.length; i++) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), mat);
      pad.name = `teleport_pad_${i}`;
      pad.position.copy(padPositions[i]);
      pad.renderOrder = 10;

      const light = new THREE.PointLight(0x00ffaa, 0.35, 6);
      light.position.copy(pad.position);
      light.position.y += 0.8;

      scene.add(pad);
      scene.add(light);

      // Track pads only (lights don’t need to be tracked for now)
      this.pads.push(pad);
    }
  },

  update() {
    // Placeholder for future teleport arc / interaction logic
  },

  disposePads(scene) {
    if (!this.pads || !this.pads.length) {
      this.pads = [];
      return;
    }
    for (const p of this.pads) {
      if (p && p.parent) p.parent.remove(p);
      if (scene) scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material && p.material.dispose) p.material.dispose();
    }
    this.pads = [];
  },

  dispose(scene) {
    this.disposePads(scene);
    if (this.group) {
      if (this.group.parent) this.group.parent.remove(this.group);
      if (scene) scene.remove(this.group);
      this.group = null;
    }
  }
};
