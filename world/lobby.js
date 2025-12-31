import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildPermanentLobby(scene) {
    const portals = [];
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x221111 }); // Darker brick to make blue pop
    const neonBlueMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, 
        emissive: 0x00ffff, 
        emissiveIntensity: 5 // This creates the "Glow" look
    });

    const lobbyGroup = new THREE.Group();

    // 1. SOLID BOX
    const box = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 20), brickMat);
    box.geometry.scale(-1, 1, 1);
    box.position.y = 3;
    lobbyGroup.add(box);

    // 2. SCARLET VR NEON SIGN (Back Wall)
    const logoBase = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), new THREE.MeshBasicMaterial({color: 0x000000}));
    logoBase.position.set(0, 3.5, -9.9); // Flush against back wall
    
    // Neon Strip for the Logo
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 0.1), neonBlueMat);
    neonStrip.position.set(0, 3.5, -9.85);
    lobbyGroup.add(logoBase, neonStrip);

    // 3. LABELED BLUE STORE PORTAL
    const storePortal = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 16, 100), neonBlueMat);
    
    // Floating "STORE" Neon Label
    const labelBar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.1), neonBlueMat);
    labelBar.position.y = 1.3;
    
    storePortal.add(ring, labelBar);
    storePortal.position.set(5.8, 1.8, 0);
    storePortal.rotation.y = -Math.PI / 2;
    storePortal.userData = { dest: 'STORE' };
    
    lobbyGroup.add(storePortal);
    portals.push(storePortal);

    scene.add(lobbyGroup);
    return { portals, lobbyGroup };
}
