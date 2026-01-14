export const Tables = {
    build(scene) {
        const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x004400 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.8;
        scene.add(mesh);
    }
};
