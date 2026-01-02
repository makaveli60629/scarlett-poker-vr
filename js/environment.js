import * as THREE from 'three';

export function createEnvironment(scene, walletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';

    const floorTex = loader.load(texturePath + 'table_felt_green.jpg');
    const wallTex = loader.load(texturePath + 'brickwall.jpg');
    const portalTex = loader.load(texturePath + 'wall_stone_runes.jpg');
    const rewardTex = loader.load(texturePath + 'dailyclaim.jpg');

    const roomOffsets = [0, -110, -220, -330]; 
    const roomNames = ["LOBBY & STORE", "POKER ZONE A", "POKER ZONE B", "VIP ZONE"];

    roomOffsets.forEach((offset, i) => {
        const roomGroup = new THREE.Group();
        roomGroup.position.z = offset;

        // Floor & Walls
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ map: floorTex }));
        floor.rotation.x = -Math.PI / 2;
        roomGroup.add(floor);

        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(100, 25), new THREE.MeshLambertMaterial({ map: portalTex }));
        backWall.position.set(0, 12.5, -50);
        roomGroup.add(backWall);

        // Daily Reward Logic for Room 0 (Store)
        if (i === 0) {
            const rewardSign = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: rewardTex }));
            rewardSign.position.set(0, 8, -20);
            roomGroup.add(rewardSign);
        }

        scene.add(roomGroup);
    });
}
