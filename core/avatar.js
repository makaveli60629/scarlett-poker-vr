import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function initAvatarStore(scene, camera) {
    // 1. THE LOCKER ROOM AREA
    const lockerRoom = new THREE.Group();
    lockerRoom.position.set(10, 0, 10); // Located off to the side of the lobby
    
    // Luxury mirror (a reflective-looking plane)
    const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 3),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 })
    );
    mirror.position.set(0, 1.5, -2);
    lockerRoom.add(mirror);
    scene.add(lockerRoom);

    // 2. THE STORE SHELVES (Holographic Displays)
    const shelfGeo = new THREE.BoxGeometry(1, 0.1, 1);
    const shelfMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    
    for (let i = 0; i < 3; i++) {
        const shelf = new THREE.Mesh(shelfGeo, shelfMat);
        shelf.position.set(8, 1, 8 + (i * 2));
        scene.add(shelf);
        
        // Add a "Magnetic Item" on each shelf
        createStoreItem(scene, shelf.position);
    }
}

function createStoreItem(scene, position) {
    // Example: A Golden Crown
    const item = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.05, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1 })
    );
    item.position.copy(position);
    item.position.y += 0.3;
    item.name = "Store_Item_Crown";
    scene.add(item);
}

// 3. MAGNETIC SNAP LOGIC
export function snapToAvatar(item, camera) {
    // This logic "parents" the item to the VR camera (your head)
    const offset = new THREE.Vector3(0, 0.2, 0); // Sit on top of head
    item.position.copy(offset);
    camera.add(item); 
}
