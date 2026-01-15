// /js/scarlett1/world_materials.js
export function makeMaterials(THREE, { quality = "quest" } = {}) {
  const low = (quality === "quest");

  const base = new THREE.MeshStandardMaterial({
    color: 0x11151f,
    roughness: low ? 0.95 : 0.85,
    metalness: 0.15
  });

  const wall = new THREE.MeshStandardMaterial({
    color: 0x0b0f18,
    roughness: 0.95,
    metalness: 0.05
  });

  const neonCyan = new THREE.MeshStandardMaterial({
    color: 0x06202a,
    emissive: 0x00e5ff,
    emissiveIntensity: low ? 0.8 : 1.25,
    roughness: 0.6,
    metalness: 0.2
  });

  const neonMagenta = new THREE.MeshStandardMaterial({
    color: 0x1a081a,
    emissive: 0xff2bd6,
    emissiveIntensity: low ? 0.75 : 1.2,
    roughness: 0.65,
    metalness: 0.2
  });

  const neonGreen = new THREE.MeshStandardMaterial({
    color: 0x08150d,
    emissive: 0x33ff66,
    emissiveIntensity: low ? 0.7 : 1.1,
    roughness: 0.7,
    metalness: 0.15
  });

  const floor = new THREE.MeshStandardMaterial({
    color: 0x070b10,
    roughness: 0.95,
    metalness: 0.05
  });

  const grid = new THREE.LineBasicMaterial({ color: 0x113355 });

  return { base, wall, neonCyan, neonMagenta, neonGreen, floor, grid };
}
