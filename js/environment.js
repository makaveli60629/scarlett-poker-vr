import * as THREE from 'three';

export const World = {
    build(scene) {
        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(5, 10, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        // The Lobby Walls (Brick Texture Category)
        const roomGeo = new THREE.BoxGeometry(30, 15, 60);
        const roomMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.BackSide });
        const room = new THREE.Mesh(roomGeo, roomMat);
        scene.add(room);

        // The Branded Poker Table
        const tableGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x076324 }); // Professional Green
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.8, -5);
        scene.add(table);
    }
};
