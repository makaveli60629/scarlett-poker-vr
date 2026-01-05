// js/teleport_machine.js — Stable Teleport Pad + Safe Spawn (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  group: null,
  padCenter: new THREE.Vector3(0, 0, 3.6),

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";
    this.group.position.copy(this.padCenter);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9 })
    );
    base.position.y = 0.06;

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.04, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 2.2,
        roughness: 0.35
      })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.12;

    const beacon = new THREE.PointLight(0x00ffaa, 0.6, 10);
    beacon.position.set(0, 1.6, 0);

    this.group.add(base, glow, beacon);
    scene.add(this.group);

    return this.group;
  },

  // World calls this to avoid spawning on top of the table
  getSafeSpawn() {
    // Spawn slightly behind pad, facing toward room
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.2),
      yaw: Math.PI // face inward
    };
  }
};
