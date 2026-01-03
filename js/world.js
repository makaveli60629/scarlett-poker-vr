import * as THREE from 'three';

export const World = {
    build(scene) {

        // LIGHTING (NO BLACK SCREENS)
        scene.add(new THREE.AmbientLight(0xffffff, 1.8));

        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(0, 10, 0);
        scene.add(sun);

        // ROOMS
        this.createArea(scene, 0, 0, 20, 0x222222);    // Lobby
        this.createArea(scene, 20, 0, 15, 0x076324);   // Poker
        this.createArea(scene, -20, 0, 15, 0x111111);  // Store
        this.createArea(scene, 0, 20, 15, 0x444444);   // Vault

        // GOLD SAFE (VISUAL TARGET)
        const safe = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 2, 1.2),
            new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 0.9,
                roughness: 0.2
            })
        );
        safe.position.set(0, 1, 25);
        scene.add(safe);
    },

    createArea(scene, x, z, size, color) {
        const mat = new THREE.MeshStandardMaterial({ color });

        // FLOOR
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            mat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        // CEILING
        const ceiling = floor.clone();
        ceiling.position.y = 5;
        ceiling.rotation.x = Math.PI / 2;
        scene.add(ceiling);
    }
};
