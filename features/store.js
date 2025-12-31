import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildStoreRoom(parentGroup) {
    const storePortals = [];
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Black Vault

    // 1. THE STORE BOX (Solid Room)
    const roomGeo = new THREE.BoxGeometry(10, 6, 10);
    const room = new THREE.Mesh(roomGeo, wallMat);
    room.geometry.scale(-1, 1, 1); // Walls face inside
    room.position.y = 3;
    parentGroup.add(room);

    // 2. THE EXIT PORTAL (Back to Lobby)
    const exit = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 16, 100), goldMat);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.3}));
    exit.add(ring, glow);
    exit.position.set(0, 1.5, 4.8);
    exit.userData = { dest: 'LOBBY' };
    parentGroup.add(exit);
    storePortals.push(exit);

    // 3. STORE ITEMS (Blue Chip Spawner)
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1), goldMat);
    pedestal.position.set(-3, 0.5, -2);
    parentGroup.add(pedestal);

    const blueChip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32),
        new THREE.MeshStandardMaterial({color: 0x0000ff, emissive: 0x0000ff, emissiveIntensity: 2})
    );
    blueChip.position.set(-3, 1.2, -2);
    parentGroup.add(blueChip);

    return { portals: storePortals };
}
