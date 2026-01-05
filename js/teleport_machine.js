// js/teleport_machine.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  group: null,
  padCenter: new THREE.Vector3(0, 0.01, 3.4),

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";

    // Pad (spawn target)
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.75, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.1,
        roughness: 0.35,
        side: THREE.DoubleSide,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(this.padCenter);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.25, 18),
      new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.8, emissive: 0x003322, emissiveIntensity: 0.7 })
    );
    core.position.copy(this.padCenter).add(new THREE.Vector3(0, 0.18, 0));

    const light = new THREE.PointLight(0x00ffaa, 0.55, 6);
    light.position.copy(core.position).add(new THREE.Vector3(0, 0.35, 0));

    this.group.add(pad, core, light);
    scene.add(this.group);

    return this.group;
  },

  // World calls this to place player safely
  getSafeSpawn() {
    // Spawn slightly behind the pad facing into the room
    return this.padCenter.clone().add(new THREE.Vector3(0, 0, 1.0));
  },

  update() {
    // (reserved for later teleport arc logic)
  },
};
