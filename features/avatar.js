import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function setupAvatar(userRig) {
    const avatarGroup = new THREE.Group();
    const neonMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, 
        emissive: 0x00ffff, 
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.7 
    });

    // Low-Poly Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 4, 8), neonMat);
    torso.position.y = -0.7;
    
    // Low-Poly Hands (The floating blue hands from the pic)
    const handGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, neonMat);
    const rightHand = new THREE.Mesh(handGeo, neonMat);
    
    avatarGroup.add(torso, leftHand, rightHand);
    userRig.add(avatarGroup);

    return { avatarGroup, leftHand, rightHand };
}
