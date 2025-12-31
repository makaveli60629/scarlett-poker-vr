import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function setupPermanentStore(scene) {
    const storeGroup = new THREE.Group();
    
    // Glowing Blue Chip Pedestal
    const chipItem = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 32, 32),
        new THREE.MeshStandardMaterial({ 
            color: 0x0000ff, 
            emissive: 0x0000bb, // The Glow Color
            emissiveIntensity: 1 
        })
    );
    chipItem.position.set(-5.5, 1.5, 0);
    chipItem.name = "BLUE_CHIP_SPAWNER";
    
    scene.add(chipItem);
    return chipItem;
}
