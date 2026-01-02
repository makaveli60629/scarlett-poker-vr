import * as THREE from 'three';

export function createEnvironment(scene, walletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';

    // 1. SKY & LIGHTING
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

    // 2. LOAD TEXTURES FROM YOUR ASSET LIST
    const floorTex = loader.load(texturePath + 'table_felt_green.jpg');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(20, 20); // Repeat for the larger 200x200 room

    const wallTex = loader.load(texturePath + 'brickwall.jpg');
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(10, 1);

    const portalTex = loader.load(texturePath + 'wall_stone_runes.jpg');
    const ceilingTex = loader.load(texturePath + 'ceiling_dome_main.jpg');

    // 3. CREATE 4 MASSIVE ROOMS (Lobby, Poker A, Poker B, VIP)
    const roomOffsets = [0, -250, -500, -750]; // Large spacing for huge rooms

    roomOffsets.forEach((offset, i) => {
        const roomGroup = new THREE.Group();
        roomGroup.position.z = offset;

        // Massive 200x200 Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshLambertMaterial({ map: floorTex })
        );
        floor.rotation.x = -Math.PI / 2;
        roomGroup.add(floor);

        // Huge Walls (200m wide, 40m high)
        const wallGeo = new THREE.PlaneGeometry(200, 40);
        const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });

        const leftWall = new THREE.Mesh(wallGeo, wallMat);
        leftWall.position.set(-100, 20, 0);
        leftWall.rotation.y = Math.PI / 2;
        roomGroup.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMat);
        rightWall.position.set(100, 20, 0);
        rightWall.rotation.y = -Math.PI / 2;
        roomGroup.add(rightWall);

        // Portal Wall at the end of the room
        const portalWall = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 40),
            new THREE.MeshLambertMaterial({ map: portalTex })
        );
        portalWall.position.set(0, 20, -100);
        roomGroup.add(portalWall);

        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshLambertMaterial({ map: ceilingTex })
        );
        ceiling.position.y = 40;
        ceiling.rotation.x = Math.PI / 2;
        roomGroup.add(ceiling);

        scene.add(roomGroup);
    });

    // 4. FLOATING HUD (Wallet)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 256;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("POKER LOBBY", 256, 100);
    ctx.fillText(`$${walletBalance}`, 256, 180);

    const hudMat = new THREE.MeshBasicMaterial({ 
        map: new THREE.CanvasTexture(canvas), 
        transparent: true 
    });
    const hud = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), hudMat);
    hud.position.set(0, 8, 20); // Floats behind the spawn point
    scene.add(hud);
}
