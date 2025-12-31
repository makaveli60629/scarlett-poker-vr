import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function setupAvatar(userRig) {
    // Create a simple "Body" that moves with the VR camera
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    body.position.y = -0.8; // Positioned below the head
    userRig.add(body);
    return body;
}
