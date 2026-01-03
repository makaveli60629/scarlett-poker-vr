import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    colliders: [],

    build(scene) {
        // Light the whole scene
        scene.add(new THREE.AmbientLight(0xffffff, 2.0));

        // Create the Lobby
        this.createRoom(scene, 0, 0, 0x111111, 'lobby_carpet.jpg');
        
        // Neon Purple Pillars (4 Pillars in the Lobby)
        const neonPurple = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        const pLocs = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
        pLocs.forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6), neonPurple);
            p.position.set(loc[0], 3, loc[1]);
            scene.add(p);
        });

        // Poker Table - Moved to X=10 so you see it immediately
        this.addTable(scene, 10, 0);
    },

    addTable(scene, x, z) {
        const table = new THREE.Group();
        table.position.set(x, 0, z);

        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.3, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        felt.position.y = 0.8;

        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.1, 16, 100),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a }) // Leather
        );
        trim.rotation.x = Math.PI/2;
        trim.position.y = 0.95;

        table.add(felt, trim);
        scene.add(table);
    },

    createRoom(scene, x, z, col, tex) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: col }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);
    }
};
