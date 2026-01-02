import * as THREE from 'three';

export function generateTables(scene) {
    const loader = new THREE.TextureLoader();
    const texturePath = 'assets/textures/';

    const feltTex = loader.load(texturePath + 'table_felt_green.jpg');
    const logoTex = loader.load(texturePath + 'brand_logo.jpg');
    const sideTex = loader.load(texturePath + 'table_atlas.jpg');

    const roomOffsets = [0, -110, -220, -330];

    roomOffsets.forEach((offset) => {
        const tableGroup = new THREE.Group();
        tableGroup.position.set(0, 0.8, offset); // Height for sitting

        // 1. Table Top (Oval-ish)
        const topGeo = new THREE.CylinderGeometry(5, 5, 0.2, 32);
        const topMat = new THREE.MeshLambertMaterial({ map: feltTex });
        const tableTop = new THREE.Mesh(topGeo, topMat);
        tableGroup.add(tableTop);

        // 2. Brand Logo (Placed in center of table)
        const logoGeo = new THREE.PlaneGeometry(2, 2);
        const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true });
        const logo = new THREE.Mesh(logoGeo, logoMat);
        logo.rotation.x = -Math.PI / 2;
        logo.position.y = 0.11;
        tableGroup.add(logo);

        // 3. Table Rail (The Padding)
        const railGeo = new THREE.TorusGeometry(5, 0.3, 16, 100);
        const railMat = new THREE.MeshLambertMaterial({ map: sideTex });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.rotation.x = Math.PI / 2;
        tableGroup.add(rail);

        scene.add(tableGroup);
    });
}
