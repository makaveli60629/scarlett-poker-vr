import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        // High Intensity Lights
        [span_12](start_span)const ambient = new THREE.AmbientLight(0xffffff, 1.5)[span_12](end_span);
        scene.add(ambient);

        const topLight = new THREE.PointLight(0xffffff, 2);
        topLight.position.set(0, 4, 0);
        scene.add(topLight);

        // Floor (Lobby Carpet)
        [span_13](start_span)const floorTex = loader.load('assets/textures/lobby_carpet.jpg')[span_13](end_span);
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            new THREE.MeshStandardMaterial({ map: floorTex })
        );
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Poker Table
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 }) // Permanent Green Felt
        );
        table.position.y = 0.8;
        scene.add(table);

        // Grid (Emergency visual guide if textures fail)
        [span_14](start_span)[span_15](start_span)const grid = new THREE.GridHelper(30, 30, 0x00f2ff, 0x444444)[span_14](end_span)[span_15](end_span);
        scene.add(grid);
    }
};
