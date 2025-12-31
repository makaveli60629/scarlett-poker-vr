import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function buildLobby(scene) {
    // 1. THE FLOOR (Luxury Red Carpet)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. THE WALLS (Solid Brick - Open Air)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x552222 }); // Fallback Brick Color
    const loader = new THREE.TextureLoader();
    
    // We use your existing brick texture path
    loader.load('../assets/brick_diffuse.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);
        wallMat.map = texture;
        wallMat.needsUpdate = true;
    });

    // Create 3 Rooms Layout (Left, Right, and Back)
    createWall(scene, wallMat, -15, 0, 30); // Left Wall
    createWall(scene, wallMat, 15, 0, 30);  // Right Wall
    createWall(scene, wallMat, 0, -15, 30, true); // Back Wall

    // 3. THE BRANDED POKER TABLE (Auto-Sit Target)
    createPokerTable(scene);
}

function createWall(scene, mat, x, z, length, rotate = false) {
    const wallGeo = new THREE.BoxGeometry(rotate ? length : 1, 6, rotate ? 1 : length);
    const wall = new THREE.Mesh(wallGeo, mat);
    wall.position.set(x, 3, z);
    scene.add(wall);
}

function createPokerTable(scene) {
    const tableGroup = new THREE.Group();

    // The Table Top (Green Felt)
    const topGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 64);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x076324 });
    const top = new THREE.Mesh(topGeo, topMat);
    
    // The Mahogany Rim (Rounder Geometry)
    const rimGeo = new THREE.TorusGeometry(2.5, 0.15, 16, 100);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x3d0c02 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.1;

    // The "Low-Poly Realistic" Card
    const cardGeo = new THREE.BoxGeometry(0.06, 0.001, 0.09);
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const card = new THREE.Mesh(cardGeo, cardMat);
    card.position.set(0, 0.15, 0.8); // Right in front of where you "sit"

    tableGroup.add(top, rim, card);
    tableGroup.position.set(0, 0.8, -5); // Positioned for Auto-Sit
    scene.add(tableGroup);
}
