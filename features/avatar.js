import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function initAvatarStore(scene, camera) {
    // 1. THE LOCKER ROOM (Mirror Area)
    const lockerArea = new THREE.Group();
    lockerArea.position.set(10, 0, 5); // Located in its own section
    
    // The Mirror (A high-gloss reflective surface)
    const mirrorGeo = new THREE.PlaneGeometry(2, 3);
    const mirrorMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        metalness: 1.0, 
        roughness: 0.05 
    });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(0, 1.5, -0.1);
    lockerArea.add(mirror);
    
    scene.add(lockerArea);

    // 2. THE STORE (Holographic Pedestals)
    createStorePedestal(scene, new THREE.Vector3(8, 0, 5), "Golden Crown");
    createStorePedestal(scene, new THREE.Vector3(8, 0, 7), "Blue Gloves");
}

function createStorePedestal(scene, position, itemName) {
    // Holographic Base
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.copy(position);
    scene.add(base);

    // The Item (Placeholder for Magnetic Snap)
    const itemGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const itemMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1 });
    const item = new THREE.Mesh(itemGeo, itemMat);
    item.position.set(position.x, 1.2, position.z);
    item.name = itemName;
    scene.add(item);
}

// 3. MAGNETIC SNAP TECH
// This function attaches an item to your VR "Head" (the Camera)
export function applyMagneticSnap(item, camera) {
    const headPivot = new THREE.Group();
    camera.add(headPivot);
    
    // Shift item to sit on top of head
    item.position.set(0, 0.3, 0); 
    headPivot.add(item);
    
    console.log(item.name + " has been snapped to your Avatar!");
}
