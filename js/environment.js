// Environment Setup - Update 1.5.5 Stability Build
import * as THREE from 'three';

export function createEnvironment(scene, playerWalletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/'; 

    // 1. REGULAR SKY (Standard Blue)
    scene.background = new THREE.Color(0x87CEEB); 

    // 2. THE FLOOR (Centered and Solid)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    loader.load(texturePath + 'poker_felt.jpg', (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10);
        floorMat.map = tex;
        floorMat.needsUpdate = true;
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0; // The Ground
    scene.add(floor);

    // 3. THE WALLS (Perfectly Attached to Floor)
    const wallHeight = 20;
    const wallGeo = new THREE.PlaneGeometry(100, wallHeight);
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    loader.load(texturePath + 'brick_wall.jpg', (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(5, 1);
        wallMat.map = tex;
        wallMat.needsUpdate = true;
    });

    // Wall logic: Position Y is exactly half of height to touch the floor (0)
    const wallSpecs = [
        { p: [0, wallHeight/2, -50], r: [0, 0, 0] },    // Back
        { p: [0, wallHeight/2, 50], r: [0, Math.PI, 0] }, // Front
        { p: [-50, wallHeight/2, 0], r: [0, Math.PI / 2, 0] }, // Left
        { p: [50, wallHeight/2, 0], r: [0, -Math.PI / 2, 0] }  // Right
    ];

    wallSpecs.forEach(spec => {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(...spec.p);
        wall.rotation.set(...spec.r);
        scene.add(wall);
    });

    // 4. THE CEILING (Closing the box)
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    ceiling.position.y = wallHeight;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // 5. CENTERED HOLOGRAM WALLET
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 256;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 45px Arial';
    ctx.textAlign = "center";
    ctx.fillText("POKER LOBBY", 256, 80);
    ctx.fillText(`WALLET: $${playerWalletBalance}`, 256, 160);
    
    const holoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 3),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide })
    );
    holoMesh.position.set(0, 5, -10); // Centered in front of spawn
    scene.add(holoMesh);
}
