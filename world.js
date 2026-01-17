import * as THREE from "three";

export function build(scene, log) {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Simple room markers
  const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
  grid.position.y = 0.001;
  scene.add(grid);

  // Spawn marker
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  );
  marker.position.set(0, 1.6, 2.6);
  scene.add(marker);

  log("[world] ready ✅ (floor + grid + spawn marker)");
}
