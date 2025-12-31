import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildPermanentLobby(scene) {
    const portals = [];
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, emissive: 0x332200 });
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x442222 });

    // 1. SOLID ENCLOSURE
    const lobbyGroup = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 20), brickMat);
    box.geometry.scale(-1, 1, 1); // Walls on inside
    box.position.y = 3;
    lobbyGroup.add(box);

    // 2. SCARLET VR LOGO (Floating on the Back Wall)
    const logoGroup = new THREE.Group();
    const logoPanel = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), goldMat);
    logoPanel.position.set(0, 3.5, -9.8);
    // Note: In a full build, we would map a "Scarlet VR" texture here
    lobbyGroup.add(logoPanel);

    // 3. LABELED STORE PORTAL (Blue Glow)
    const storePortal = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 16, 100), new THREE.MeshBasicMaterial({color: 0x0000ff}));
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.3), new THREE.MeshBasicMaterial({color: 0x0000ff, transparent: true, opacity: 0.8}));
    label.position.y = 1.3; // Floating label above portal
    
    storePortal.add(ring, label);
    storePortal.position.set(5.8, 1.8, 0);
    storePortal.rotation.y = -Math.PI / 2;
    storePortal.userData = { dest: 'STORE' };
    
    lobbyGroup.add(storePortal);
    portals.push(storePortal);

    scene.add(lobbyGroup);
    return { portals, lobbyGroup };
}
