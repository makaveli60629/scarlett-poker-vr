import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildStoreRoom(scene) {
    const storeGroup = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const neonBlue = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 3 });

    // 1. THE VAULT (Solid 8x8 Room)
    const vault = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), darkMat);
    vault.geometry.scale(-1, 1, 1);
    vault.position.y = 2.5;
    storeGroup.add(vault);

    // 2. THE AVATAR MIRROR (Back Wall)
    const mirrorFrame = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), neonBlue);
    mirrorFrame.position.set(0, 1.8, -3.9);
    
    const mirrorSurface = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 3.3), 
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0 })
    );
    mirrorSurface.position.z = 0.05;
    mirrorFrame.add(mirrorSurface);
    storeGroup.add(mirrorFrame);

    // 3. AVATAR ACCESSORIES (Shirts & Hats on Neon Racks)
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4), neonBlue);
    rack.position.set(-3.8, 1.5, 0);
    storeGroup.add(rack);

    // 4. RETURN PORTAL (To Lobby)
    const exit = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff}));
    exit.position.set(0, 1.2, 3.8);
    exit.userData = { dest: 'LOBBY' };
    storeGroup.add(exit);

    scene.add(storeGroup);
    return { portals: [exit], storeGroup };
}
