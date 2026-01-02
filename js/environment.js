// Environment & Texture Setup - Update 1.5.2
import * as THREE from 'three';

export function createEnvironment(scene, playerWalletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/'; // Your specific folder path

    // 1. THE FLOOR (Branded Poker Felt)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide 
    });

    loader.load(texturePath + 'poker_felt.jpg', (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10);
        floorMat.map = tex;
        floorMat.needsUpdate = true;
    }, undefined, (err) => console.error("Floor Texture Missing at: " + texturePath));

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 2. THE BRICK WALLS (The "Zone" Room)
    const wallGeo = new THREE.PlaneGeometry(100, 20);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    loader.load(texturePath + 'brick_wall.jpg', (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(5, 1);
        wallMat.map = tex;
        wallMat.needsUpdate = true;
    }, undefined, (err) => console.error("Wall Texture Missing at: " + texturePath));

    // Placing 4 Walls
    const wallSpecs = [
        { pos: [0, 10, -50], rot: [0, 0, 0] },
        { pos: [0, 10, 50], rot: [0, Math.PI, 0] },
        { pos: [-50, 10, 0], rot: [0, Math.PI / 2, 0] },
        { pos: [50, 10, 0], rot: [0, -Math.PI / 2, 0] }
    ];

    wallSpecs.forEach(spec => {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(...spec.pos);
        wall.rotation.set(...spec.rot);
        scene.add(wall);
    });

    // 3. THE CEILING (Fixing the Black Gap)
    const ceilGeo = new THREE.PlaneGeometry(100, 100);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.y = 20;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // 4. MEGA BRIGHT LIGHTING (For Oculus Clarity)
    const ambient = new THREE.AmbientLight(0xffffff, 1.8); 
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // 5. HOLOGRAM WALLET (Update 1.2)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 256;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 50px Arial';
    ctx.fillText("WALLET", 150, 100);
    ctx.fillText(`$${playerWalletBalance}`, 150, 180);
    
    const holoTex = new THREE.CanvasTexture(canvas);
    const holoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 2),
        new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, side: THREE.DoubleSide })
    );
    holoMesh.position.set(0, 3, -10);
    scene.add(holoMesh);
}
