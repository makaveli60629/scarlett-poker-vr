export const World = {
    async init({ THREE, scene, player }) {
        // Floor Mesh
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.name = "ground"; // Required for your controls.js logic
        scene.add(floor);

        // A Bright Cube at the center (So you know where you are)
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1), 
            new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff })
        );
        box.position.set(0, 0.5, 0);
        scene.add(box);
    }
};
