import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildStoreRoom(scene) {
    const storeGroup = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0 });

    // 1. THE VAULT BOX
    const vault = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), wallMat);
    vault.geometry.scale(-1, 1, 1);
    vault.position.y = 2.5;
    storeGroup.add(vault);

    // 2. THE AVATAR MIRROR
    const mirrorFrame = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({color: 0xffd700}));
    mirrorFrame.position.set(0, 1.6, -3.9);
    const mirrorSurface = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), mirrorMat);
    mirrorSurface.position.z = 0.01;
    mirrorFrame.add(mirrorSurface);
    storeGroup.add(mirrorFrame);

    // 3. ACCESSORY RACKS (Shirts & Hats)
    const rackGeo = new THREE.BoxGeometry(3, 0.1, 0.2);
    const leftRack = new THREE.Mesh(rackGeo, wallMat);
    leftRack.position.set(-3.8, 1.5, 0);
    leftRack.rotation.y = Math.PI / 2;
    
    // Shirt Item (Blue Glow)
    const shirtIcon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.1), new THREE.MeshStandardMaterial({color: 0x0000ff, emissive: 0x0000ff}));
    shirtIcon.position.y = 0.5;
    leftRack.add(shirtIcon);

    storeGroup.add(leftRack);

    // 4. EXIT TO LOBBY
    const exit = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff}));
    exit.position.set(0, 1, 3.8);
    exit.userData = { dest: 'LOBBY' };
    storeGroup.add(exit);

    scene.add(storeGroup);
    return { portals: [exit], storeGroup };
}
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildStoreRoom(scene) {
    const storeGroup = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0 });

    // 1. THE VAULT BOX
    const vault = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), wallMat);
    vault.geometry.scale(-1, 1, 1);
    vault.position.y = 2.5;
    storeGroup.add(vault);

    // 2. THE AVATAR MIRROR
    const mirrorFrame = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({color: 0xffd700}));
    mirrorFrame.position.set(0, 1.6, -3.9);
    const mirrorSurface = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), mirrorMat);
    mirrorSurface.position.z = 0.01;
    mirrorFrame.add(mirrorSurface);
    storeGroup.add(mirrorFrame);

    // 3. ACCESSORY RACKS (Shirts & Hats)
    const rackGeo = new THREE.BoxGeometry(3, 0.1, 0.2);
    const leftRack = new THREE.Mesh(rackGeo, wallMat);
    leftRack.position.set(-3.8, 1.5, 0);
    leftRack.rotation.y = Math.PI / 2;
    
    // Shirt Item (Blue Glow)
    const shirtIcon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.1), new THREE.MeshStandardMaterial({color: 0x0000ff, emissive: 0x0000ff}));
    shirtIcon.position.y = 0.5;
    leftRack.add(shirtIcon);

    storeGroup.add(leftRack);

    // 4. EXIT TO LOBBY
    const exit = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff}));
    exit.position.set(0, 1, 3.8);
    exit.userData = { dest: 'LOBBY' };
    storeGroup.add(exit);

    scene.add(storeGroup);
    return { portals: [exit], storeGroup };
}
