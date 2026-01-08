// /js/StoreChips.js
// Lightweight store kiosk + chip prototype spawner hooks.

export function createStoreKiosk({ THREE, position = { x: 6, y: 0, z: -4 } }) {
  const group = new THREE.Group();
  group.name = "StoreKiosk";
  group.position.set(position.x, position.y, position.z);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.6 })
  );
  base.position.y = 0.55;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0x101010,
      emissive: 0x5a2cff,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.95,
    })
  );
  sign.position.set(0, 1.35, 0.41);
  group.add(sign);

  // invisible “interact” collider
  const col = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
  col.position.y = 0.8;
  col.userData.isInteractable = true;
  col.userData.action = "OPEN_STORE";
  group.add(col);

  return group;
}

// chip mesh generator (you’ll attach physics in your existing physics system)
export function createChipMesh({ THREE, value = 100, radius = 0.022, thickness = 0.008 }) {
  const geo = new THREE.CylinderGeometry(radius, radius, thickness, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x202020,
    metalness: 0.1,
    roughness: 0.45,
  });
  const chip = new THREE.Mesh(geo, mat);
  chip.rotation.x = Math.PI / 2;
  chip.castShadow = true;
  chip.receiveShadow = true;
  chip.userData.isChip = true;
  chip.userData.value = value;
  return chip;
}
