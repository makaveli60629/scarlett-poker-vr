import * as THREE from 'three';

export function createEnvironment(scene, walletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';

    const floorTex = loader.load(texturePath + 'table_felt_green.jpg');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(20, 20); // Scaled for 200x200

    const wallTex = loader.load(texturePath + 'brickwall.jpg');
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(10, 1);

    const portalTex = loader.load(texturePath + 'wall_stone_runes.jpg');
    const rewardTex = loader.load(texturePath + 'dailyclaim.jpg');

    const roomOffsets = [0, -220, -440, -660]; 

    roomOffsets.forEach((offset, i) => {
        const roomGroup = new THREE.Group();
        roomGroup.position.z = offset;

        // Expanded 200x200 Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ map: floorTex }));
        floor.rotation.x = -Math.PI / 2;
        roomGroup.add(floor);

        // Huge Portal Wall (Z: -100)
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), new THREE.MeshLambertMaterial({ map: portalTex }));
        backWall.position.set(0, 20, -100);
        roomGroup.add(backWall);

        // Daily Reward Sign (Only in Lobby/Store Room 0)
        if (i === 0) {
            const rewardSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshBasicMaterial({ map: rewardTex }));
            rewardSign.position.set(0, 15, -40);
            roomGroup.add(rewardSign);
        }

        scene.add(roomGroup);
    });
}
