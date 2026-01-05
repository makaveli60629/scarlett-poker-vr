// js/vip_room.js — Simple VIP Room shell (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VIPRoom = {
  build(scene) {
    const g = new THREE.Group();
    g.name = "VIPRoom";

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    g.add(floor);

    // Soft trim ring (visual “VIP” feel)
    const trim = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 7.35, 96),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.35,
        roughness: 0.5,
        side: THREE.DoubleSide
      })
    );
    trim.rotation.x = -Math.PI / 2;
    trim.position.y = 0.01;
    g.add(trim);

    scene.add(g);
    return g;
  }
};
