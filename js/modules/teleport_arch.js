// /js/modules/teleport_arch.js
export function createTeleportArch({ THREE }, { position }){
  const group = new THREE.Group();
  group.name = "teleportArch";

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness:0.2, roughness:0.35 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive:0x2277ff, emissiveIntensity:0.9, metalness:0.1, roughness:0.2 });

  // Posts
  const postGeo = new THREE.BoxGeometry(0.25, 2.2, 0.25);
  const left = new THREE.Mesh(postGeo, mat);
  const right = new THREE.Mesh(postGeo, mat);
  left.position.set(position.x - 1.1, position.y + 1.1, position.z);
  right.position.set(position.x + 1.1, position.y + 1.1, position.z);
  group.add(left, right);

  // Top arch (torus segment look)
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.10, 16, 64, Math.PI), glow);
  arch.rotation.z = Math.PI;
  arch.position.set(position.x, position.y + 2.2, position.z);
  group.add(arch);

  // Base platform
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.12, 36), mat);
  pad.position.set(position.x, position.y + 0.06, position.z);
  group.add(pad);

  // Floating label bar (simple)
  const label = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.12), glow);
  label.position.set(position.x, position.y + 1.9, position.z - 0.45);
  group.add(label);

  return { group };
}
