import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildStoreRoom(scene) {
    const storeGroup = new THREE.Group();
    const neonBlue = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, 
        emissive: 0x00ffff, 
        emissiveIntensity: 4 
    });
    const darkWall = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });

    // 1. THE VAULT ROOM
    const room = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), darkWall);
    room.geometry.scale(-1, 1, 1);
    room.position.y = 3;
    storeGroup.add(room);

    // 2. THE NEON MIRROR (Exact Concept Design)
    const mirrorFrame = new THREE.Group();
    const border = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.1), neonBlue);
    const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 3), 
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0 })
    );
    surface.position.z = 0.06;
    mirrorFrame.add(border, surface);
    mirrorFrame.position.set(0, 1.8, -4.8);
    storeGroup.add(mirrorFrame);

    // 3. FLOATING ACCESSORY RACKS (Left Side)
    const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 4), neonBlue);
    rackFrame.position.set(-4.8, 2, 0);
    storeGroup.add(rackFrame);

    // Floating Hat Concept
    const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.1), neonBlue);
    hatBase.position.set(-4.5, 1.5, 1);
    storeGroup.add(hatBase);

    // 4. RETURN PORTAL (Right Side)
    const exitPortal = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05), neonBlue);
    exitPortal.add(ring);
    exitPortal.position.set(4.8, 1.5, 0);
    exitPortal.rotation.y = -Math.PI / 2;
    exitPortal.userData = { dest: 'LOBBY' };
    storeGroup.add(exitPortal);

    scene.add(storeGroup);
    return { portals: [exitPortal], storeGroup };
}
