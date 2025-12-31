import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildPermanentLobby(scene) {
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x441111 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x880000 });

    const lobbyGroup = new THREE.Group();
    
    // Solid Box (12x6x20)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 22), carpetMat);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 22), brickMat);
    ceil.position.y = 6;
    lobbyGroup.add(floor, ceil);

    // Wall Builder with Trim
    const walls = [
        { w: 22, h: 6, pos: [-6, 3, 0], rot: [0, Math.PI/2, 0] }, // Left
        { w: 22, h: 6, pos: [6, 3, 0], rot: [0, -Math.PI/2, 0] }, // Right
        { w: 12, h: 6, pos: [0, 3, -11], rot: [0, 0, 0] },        // Front
        { w: 12, h: 6, pos: [0, 3, 11], rot: [0, Math.PI, 0] }   // Back
    ];

    walls.forEach(data => {
        const wGroup = new THREE.Group();
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(data.w, data.h), brickMat);
        
        const topTrim = new THREE.Mesh(new THREE.BoxGeometry(data.w, 0.2, 0.1), goldMat);
        topTrim.position.y = 2.9;
        
        const botTrim = new THREE.Mesh(new THREE.BoxGeometry(data.w, 0.2, 0.1), goldMat);
        botTrim.position.y = -2.9;

        wGroup.add(wall, topTrim, botTrim);
        wGroup.position.set(...data.pos);
        wGroup.rotation.set(...data.rot);
        lobbyGroup.add(wGroup);
    });

    scene.add(lobbyGroup);

    // Glowing Portals
    const portals = [];
    [0x00ff00, 0xff00ff, 0x00ffff].forEach((col, i) => {
        const p = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 16, 100), goldMat);
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
        p.add(ring, glow);
        p.position.set(5.8, 1.8, (i * 6) - 6);
        p.rotation.y = -Math.PI/2;
        scene.add(p);
        portals.push(p);
    });

    return { portals };
}
