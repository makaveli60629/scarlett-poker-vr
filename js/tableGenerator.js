import * as THREE from 'three';

export function generateTables(scene) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';
    const logoTex = loader.load(texturePath + 'brand_logo.jpg');
    const feltTex = loader.load(texturePath + 'table_felt_green.jpg');

    const roomOffsets = [0, -220, -440, -660];

    roomOffsets.forEach((offset, i) => {
        // Table is centered at room origin (0,0,offset)
        const tableGroup = new THREE.Group();
        tableGroup.position.set(0, 0.8, offset);

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(8, 8, 0.3, 32),
            new THREE.MeshLambertMaterial({ map: feltTex })
        );
        tableGroup.add(top);

        const logo = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.y = 0.16;
        tableGroup.add(logo);

        scene.add(tableGroup);
    });
}
