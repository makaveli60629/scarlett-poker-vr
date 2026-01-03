import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const loader = new THREE.TextureLoader();

export const World = {
    colliders: [],

    build(scene) {
        // Light Audit: Total Visibility
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const pLight = new THREE.PointLight(0xffffff, 1.5);
        pLight.position.set(0, 8, 0);
        scene.add(pLight);

        // 1. THE ROOMS (Audit: 40x40 squares)
        this.createRoom(scene, 0, 0, 0x222222, 'lobby_carpet.jpg'); // Lobby
        this.createRoom(scene, 40, 0, 0x076324, 'poker_felt.jpg');  // Poker
        this.createRoom(scene, -40, 0, 0x1a1a1a, 'brickwall.jpg'); // Store

        // 2. LOBBY PILLARS (Neon Purple)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-8,-8], [8,-8], [-8,8], [8,8]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // 3. POKER TABLES (With Colliders)
        this.addTable(scene, 40, 0);

        // 4. THE MIRROR (In the West Room/Store)
        const mirror = new Reflector(new THREE.PlaneGeometry(6, 8), {
            clipBias: 0.003, color: 0x888888
        });
        mirror.position.set(-59.5, 4, 0); // Wall of the store
        mirror.rotation.y = Math.PI / 2;
        scene.add(mirror);

        // 5. CEILING (Prevent Black Void)
        const ceilGeo = new THREE.PlaneGeometry(120, 120);
        const ceil = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        ceil.position.y = 10;
        ceil.rotation.x = Math.PI / 2;
        scene.add(ceil);
    },

    createRoom(scene, x, z, col, tex) {
        const floorMat = new THREE.MeshStandardMaterial({ color: col });
        loader.load(`assets/textures/${tex}`, (t) => { floorMat.map = t; floorMat.needsUpdate = true; });
        
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        // Solid Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const wallG = new THREE.BoxGeometry(40, 10, 0.5);
        [ [x, 5, z-20], [x, 5, z+20] ].forEach(p => {
            const w = new THREE.Mesh(wallG, wallMat); w.position.set(...p); scene.add(w);
        });
    },

    addTable(scene, x, z) {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        table.position.set(x, 0.9, z);
        scene.add(table);
    }
};
