// Environment & Texture Setup - Update 1.5.4
import * as THREE from 'three';

export function createEnvironment(scene, playerWalletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/'; // Enforced folder path

    // 1. THE REGULAR SKY
    // Creates a giant blue sphere around the world
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // 2. THE FLOOR (Branded Poker Felt)
    // Using MeshBasicMaterial so it is bright and visible without lights
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    loader.load(texturePath + 'poker_felt.jpg', (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(5, 5);
        floorMat.map = tex;
        floorMat.needsUpdate = true;
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 3. THE BRICK WALLS (Lobby + 3 Rooms)
    const wallGeo = new THREE.PlaneGeometry(100, 25);
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    loader.load(texturePath + 'brick_wall.jpg', (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 1);
        wallMat.map = tex;
        wallMat.needsUpdate = true;
    });

    // Defining 4 walls to enclose the space
    const walls = [
        { p: [0, 12.5, -50], r: [0, 0, 0] },    // Back
        { p: [0, 12.5, 50], r: [0, Math.PI, 0] }, // Front
        { p: [-50, 12.5, 0], r: [0, Math.PI / 2, 0] }, // Left
        { p: [50, 12.5, 0], r: [0, -Math.PI / 2, 0] }  // Right
    ];

    walls.forEach(w => {
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(...w.p);
        wallMesh.rotation.set(...w.r);
        scene.add(wallMesh);
    });

    // 4. THE CEILING (Light Grey)
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.DoubleSide })
    );
    ceiling.position.y = 25;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // 5. HOLOGRAM WALLET (Update 1.2)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 256;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 50px Courier';
    ctx.fillText("LOBBY WALLET", 1
