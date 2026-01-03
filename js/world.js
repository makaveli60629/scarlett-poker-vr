import * as THREE from 'three';

export const World = {
    build(scene) {
        // LIGHTING: Total visibility
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(5, 15, 5);
        scene.add(sun);

        // 4 ROOMS (Lobby, Store, Poker, Vault)
        this.createFloor(scene, 0, 0, 20, 0x333333); // Lobby
        this.createFloor(scene, 20, 0, 20, 0x076324); // Poker Room
        this.createFloor(scene, -20, 0, 20, 0x1a1a1a); // Store
        this.createFloor(scene, 0, 20, 20, 0x444444); // Vault

        // OBJECT 1: THE GOLD SAFE (In Vault)
        const safe = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 })
        );
        safe.position.set(0, 1, 28);
        scene.add(safe);

        // POKER TABLE
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.5, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        table.position.set(20, 0.9, 0);
        scene.add(table);
    },

    createFloor(scene, x, z, size, col) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: col }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);
        // Ceiling
        const ceil = floor.clone();
        ceil.position.y = 5;
        ceil.rotation.x = Math.PI / 2;
        scene.add(ceil);
    }
};
