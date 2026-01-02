import * as THREE from 'three';

export function createEnvironment(scene, walletBalance) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';

    const floorTex = loader.load(texturePath + 'table_felt_green.jpg');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(8, 8);

    const wallTex = loader.load(texturePath + 'brickwall.jpg');
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(4, 1);

    const portalTex = loader.load(texturePath + 'wall_stone_runes.jpg');
    const ceilTex = loader.load(texturePath + 'ceiling_dome_main.jpg');

    const roomOffsets = [0, -110, -220, -330];
    
    roomOffsets.forEach((offset) => {
        const roomGroup = new THREE.Group();
        roomGroup.position.z = offset;

        // Plane Meshes
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ map: floorTex }));
        floor.rotation.x = -Math.PI / 2;
        roomGroup.add(floor);

        const left = new THREE.Mesh(new THREE.PlaneGeometry(100, 25), new THREE.MeshLambertMaterial({ map: wallTex }));
        left.position.set(-50, 12.5, 0); left.rotation.y = Math.PI / 2;
        roomGroup.add(left);

        const right = new THREE.Mesh(new THREE.PlaneGeometry(100, 25), new THREE.MeshLambertMaterial({ map: wallTex }));
        right.position.set(50, 12.5, 0); right.rotation.y = -Math.PI / 2;
        roomGroup.add(right);

        const portal = new THREE.Mesh(new THREE.PlaneGeometry(100, 25), new THREE.MeshLambertMaterial({ map: portalTex }));
        portal.position.set(0, 12.5, -50);
        roomGroup.add(portal);

        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ map: ceilTex }));
        ceiling.position.y = 25; ceiling.rotation.x = Math.PI / 2;
        roomGroup.add(ceiling);

        scene.add(roomGroup);
    });
}
