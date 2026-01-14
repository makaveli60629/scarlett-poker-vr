export const Tables = {
    build(scene) {
        const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x004400 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        
        // Height of 0.8 meters is standard table height
        table.position.y = 0.8; 
        
        scene.add(table);
        console.log('[TABLE] Poker table generated.');
    }
};
