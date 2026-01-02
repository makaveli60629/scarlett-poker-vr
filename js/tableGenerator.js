import * as THREE from 'three';

export function generateTables(scene) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';
    const logoTex = loader.load(texturePath + 'brand_logo.jpg');
    const feltTex = loader.load(texturePath + 'table_felt_green.jpg');
    const atlasTex = loader.load(texturePath + 'table_atlas.jpg');

    // Spacing tables for the 200x200 rooms (aligned with environment.js)
    const roomOffsets = [0, -250, -500, -750];

    roomOffsets.forEach((offset, i) => {
        const tableGroup = new THREE.Group();
        tableGroup.position.set(0, 0.85, offset); // Proper table height

        // Main Surface
        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(8, 8, 0.4, 64),
            new THREE.MeshLambertMaterial({ map: feltTex })
        );
        tableGroup.add(top);

        // Branding (logo center)
        const logo = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 4),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.y = 0.21;
        tableGroup.add(logo);

        // Padded Rail
        const rail = new THREE.Mesh(
            new THREE.TorusGeometry(8, 0.4, 16, 100),
            new THREE.MeshLambertMaterial({ map: atlasTex })
        );
        rail.rotation.x = Math.PI / 2;
        tableGroup.add(rail);

        scene.add(tableGroup);
    });
}
