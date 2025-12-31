import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildPermanentLobby(scene) {
    // 1. THE LUXURY MATERIALS
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, metalness: 1.0, roughness: 0.2, emissive: 0x332200 
    });
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x660000 });

    // 2. THE MAIN BOX (Solid Walls)
    const lobbyGroup = new THREE.Group();
    
    // Floor & Ceiling
    createBox(lobbyGroup, 12, 0.2, 22, 0, 0, 0, carpetMat); // Floor
    createBox(lobbyGroup, 12, 0.2, 22, 0, 6, 0, brickMat);  // Ceiling

    // 4 Walls with Gold Trim
    addTrimmedWall(lobbyGroup, 22, 6, new THREE.Vector3(-6, 3, 0), Math.PI/2, brickMat, goldMat); // Left
    addTrimmedWall(lobbyGroup, 22, 6, new THREE.Vector3(6, 3, 0), -Math.PI/2, brickMat, goldMat); // Right
    addTrimmedWall(lobbyGroup, 12, 6, new THREE.Vector3(0, 3, -11), 0, brickMat, goldMat);        // Front
    addTrimmedWall(lobbyGroup, 12, 6, new THREE.Vector3(0, 3, 11), Math.PI, brickMat, goldMat);   // Back

    scene.add(lobbyGroup);

    // 3. THE GLOWING PORTALS (Interactive Points)
    const portals = [];
    const colors = [0x00ff00, 0xff00ff, 0x00ffff]; // Green, Pink, Cyan
    
    for(let i = 0; i < 3; i++) {
        const portalGroup = new THREE.Group();
        
        // The Frame (Solid Gold)
        const frame = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 16, 100), goldMat);
        
        // The Glowing Inner (Emissive)
        const glowInner = new THREE.Mesh(
            new THREE.CircleGeometry(0.95, 32),
            new THREE.MeshBasicMaterial({ 
                color: colors[i], 
                transparent: true, 
                opacity: 0.5,
                side: THREE.DoubleSide
            })
        );

        portalGroup.add(frame, glowInner);
        portalGroup.position.set(5.8, 2, (i * 6) - 6);
        portalGroup.rotation.y = -Math.PI / 2;
        portalGroup.userData = { roomID: i + 1, originalOpacity: 0.5 };
        
        scene.add(portalGroup);
        portals.push(portalGroup);
    }

    return { portals, lobbyGroup };
}

function addTrimmedWall(parent, w, h, pos, rotY, wallMat, goldMat) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    
    // Gold Trim Top
    const trimTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 0.1), goldMat);
    trimTop.position.y = h/2 - 0.1;
    
    // Gold Trim Bottom
    const trimBot = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 0.1), goldMat);
    trimBot.position.y = -h/2 + 0.1;

    const group = new THREE.Group();
    group.add(wall, trimTop, trimBot);
    group.position.copy(pos);
    group.rotation.y = rotY;
    parent.add(group);
}

function createBox(parent, w, h, d, x, y, z, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
}
