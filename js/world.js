export const World = {
    async init({ THREE, scene, root }) {
        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const mat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.2 });
        
        // 1. TOP FLOOR
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        scene.add(floor);

        // 2. THE PIT (The centerpiece)
        const pitGeo = new THREE.CylinderGeometry(6, 6, 2, 32);
        const pitMat = new THREE.MeshStandardMaterial({ color: 0x000000, wireframe: false });
        const pit = new THREE.Mesh(pitGeo, pitMat);
        pit.position.set(0, -1, 0); // Sunken
        scene.add(pit);

        // 3. TABLE
        const table = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 32), 
            new THREE.MeshStandardMaterial({ color: 0xd2b46a, metalness: 0.8 }));
        table.position.set(0, -0.8, 0);
        scene.add(table);
    }
};
