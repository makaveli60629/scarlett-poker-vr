import * as THREE from 'three';

export function generateTables(scene) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';
    const logoTex = loader.load(texturePath + 'brand_logo.jpg');
    const feltTex = loader.load(texturePath + 'table_felt_green.jpg');

    const roomOffsets = [0, -110, -220, -330];

    roomOffsets.forEach((offset, i) => {
        // Room 0 is the Store/Daily Pick area
        const tableSize = (i === 0) ? 3 : 6; 
        
        const tableGroup = new THREE.Group();
        tableGroup.position.set(0, 0.8, offset);

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(tableSize, tableSize, 0.2, 32),
            new THREE.MeshLambertMaterial({ map: feltTex })
        );
        tableGroup.add(top);

        const logo = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.y = 0.11;
        tableGroup.add(logo);

        scene.add(tableGroup);
    });
}
