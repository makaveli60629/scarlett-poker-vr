    // Environment Setup - Update 1.5.2 (Texture Integrated)
import * as THREE from 'three';

export function createEnvironment(scene, playerWalletBalance) {
    const textureLoader = new THREE.TextureLoader();

    // 1. THE FLOOR (Branded Poker Felt)
    // Replace 'poker_felt.jpg' with your actual filename from the folder
    const floorTexture = textureLoader.load('poker_felt.jpg'); 
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. THE BRICK WALLS (3 Rooms + Lobby)
    // Replace 'brick_wall.jpg' with your actual filename
    const brickTexture = textureLoader.load('brick_wall.jpg');
    brickTexture.wrapS = THREE.RepeatWrapping;
    brickTexture.wrapT = THREE.RepeatWrapping;
    brickTexture.repeat.set(4, 1); // Repeats the brick pattern

    const wallMat = new THREE.MeshStandardMaterial({ map: brickTexture });
    const wallGeo = new THREE.PlaneGeometry(100, 20);
    
    // Back Wall
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 10, -50);
    scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-50, 10, 0);
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(50, 10, 0);
    scene.add(rightWall);

    // 3. THE CEILING (Fixing the "Black Gap")
    const ceilingGeo = new THREE.PlaneGeometry(100, 100);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); 
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 20;
    scene.add(ceiling);

    // 4. MEGA LIGHTING (Ensuring visibility on Android/Oculus)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Very bright
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
    topLight.position.set(0, 18, 0);
    scene.add(topLight);

    // 5. HOLOGRAM WALLET (Update 1.2)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'Bold 40px Arial';
    ctx.fillText("LOBBY - WALLET", 50, 50);
    ctx.fillText(`$${playerWalletBalance}`, 50, 120);

    const holoTex = new THREE.CanvasTexture(canvas);
    const holoGeo = new THREE.PlaneGeometry(4, 2);
    const holoMat = new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, side: THREE.DoubleSide });
    const hologram = new THREE.Mesh(holoGeo, holoMat);
    hologram.position.set(0, 5, -5);
    scene.add(hologram);
}
