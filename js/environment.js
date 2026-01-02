// Environment & Zone Room Setup - Update 1.5.2
import * as THREE from 'three';

export function createEnvironment(scene, playerWalletBalance) {
    // 1. The Floor (The Green Tabletop/Ground)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a472a }); // Poker Green
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 2. The Walls (Fixing the "No Walls" issue)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });
    const wallGeo = new THREE.PlaneGeometry(100, 20);
    
    // Back Wall
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.z = -50;
    backWall.position.y = 10;
    scene.add(backWall);

    // 3. The Hologram Wallet (Update 1.2 Feature)
    // Positioned before the "Plane Tables Zone"
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.font = 'Bold 40px Arial';
    ctx.fillText("TABLES ZONE", 50, 50);
    ctx.font = '30px Arial';
    ctx.fillText(`WALLET: $${playerWalletBalance}`, 50, 120);

    const texture = new THREE.CanvasTexture(canvas);
    const holoGeo = new THREE.PlaneGeometry(4, 2);
    const holoMat = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true, 
        opacity: 0.8,
        side: THREE.DoubleSide 
    });
    const hologram = new THREE.Mesh(holoGeo, holoMat);
    hologram.position.set(0, 5, -10); // Floating in front of entrance
    scene.add(hologram);

    // 4. Lighting (Fixing the "Not Bright Enough" issue)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // 5. Sky/Ceiling (The "Black" fix)
    scene.background = new THREE.Color(0x050505); // Dark space-like ceiling
}
