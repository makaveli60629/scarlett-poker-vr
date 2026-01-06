// /js/teleport_machine.js — Stable Teleport Pad + Safe Spawn (9.0)
// GitHub Pages safe: uses local ./three.js wrapper.

import * as THREE from "./three.js";

export const TeleportMachine = {
  group: null,
  padCenter: new THREE.Vector3(0, 0, 3.6),

  build(scene, texLoader = null) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";
    this.group.position.copy(this.padCenter);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9, metalness: 0.2 });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.12, 28),
      baseMat
    );
    base.position.y = 0.06;

    // optional texture ring (Teleport glow)
    let glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.1
    });

    if (texLoader) {
      try {
        const t = texLoader.load(
          "assets/textures/Teleport glow.jpg",
          (tt) => {
            tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
            tt.repeat.set(1, 1);
            tt.colorSpace = THREE.SRGBColorSpace;
          },
          undefined,
          () => {}
        );
        glowMat = new THREE.MeshStandardMaterial({
          map: t,
          color: 0xffffff,
          emissive: 0x00ffaa,
          emissiveIntensity: 1.6,
          roughness: 0.35,
          metalness: 0.1,
          transparent: true,
          opacity: 0.95
        });
      } catch (e) {}
    }

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.04, 12, 48),
      glowMat
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.12;

    const beacon = new THREE.PointLight(0x00ffaa, 0.8, 12);
    beacon.position.set(0, 1.6, 0);

    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.9,
        roughness: 0.35,
        metalness: 0.35
      })
    );
    topCap.position.set(0, 0.18, 0);

    this.group.add(base, glow, beacon, topCap);
    scene.add(this.group);

    return this.group;
  },

  // World calls this to avoid spawning on top of the table
  getSafeSpawn() {
    // Spawn slightly behind pad, facing toward the room/table (yaw 0)
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.2),
      yaw: 0
    };
  }
};
