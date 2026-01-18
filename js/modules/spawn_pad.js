// /js/modules/spawn_pad.js
export function createSpawnPad({ THREE }, { position }){
  const group = new THREE.Group();
  group.name = "spawnPad";

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.15, 32),
    new THREE.MeshStandardMaterial({ color: 0x2bff7a, metalness:0.1, roughness:0.4 })
  );
  base.position.copy(position);
  base.position.y += 0.075;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.06, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive:0x22ff88, emissiveIntensity:0.6 })
  );
  ring.rotation.x = Math.PI/2;
  ring.position.set(position.x, position.y + 0.18, position.z);
  group.add(ring);

  // Small red pillar marker (helps confirm you spawned correctly)
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xff3333 })
  );
  pillar.position.set(position.x, position.y + 0.6, position.z);
  group.add(pillar);

  const spawnPos = position.clone();
  spawnPos.y = 0; // rig y stays 0; camera is 1.65 inside rig
  return { group, spawnPos };
}
