import * as THREE from 'three';
const loader = new THREE.TextureLoader();

export const World = {
    colliders: [],

    build(scene) {
        // High-Intensity Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(5, 15, 5);
        scene.add(sun);

        // TEXTURED FLOOR (Lobby)
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            map: loader.load('assets/textures/lobby_carpet.jpg') 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // PHYSICAL CEILING (To fix the black void)
        const ceil = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
        ceil.position.y = 10;
        ceil.rotation.x = Math.PI / 2;
        scene.add(ceil);

        // NEON PURPLE PILLARS
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-12,-12], [12,-12], [-12,12], [12,12]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 10, 0.4), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // POKER TABLE
        this.addTable(scene, 10, 0);
    },

    addTable(scene, x, z) {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.4, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0x076324, 
                map: loader.load('assets/textures/poker_felt.jpg') 
            })
        );
        table.position.set(x, 0.9, z);
        scene.add(table);
        this.colliders.push(new THREE.Box3().setFromObject(table));
    }
};
