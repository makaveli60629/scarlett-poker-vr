import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const World = {
    colliders: [],

    build(scene) {
        // High-Intensity Lighting Audit
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sun = new THREE.PointLight(0xffffff, 2);
        sun.position.set(0, 10, 0);
        scene.add(sun);

        // 1. CREATE THE 4 ROOMS
        this.createRoom(scene, 0, 0, 0x222222, "Lobby");      // Center
        this.createRoom(scene, 40, 0, 0x076324, "Poker Room"); // East
        this.createRoom(scene, -40, 0, 0x111111, "Store");    // West
        this.createRoom(scene, 0, 40, 0x050505, "Vault");     // North

        // 2. NEON PILLARS (Lobby)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-8,-8], [8,-8], [-8,8], [8,8]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // 3. POKER TABLES
        this.addTable(scene, 40, 0); // Table 1
        this.addTable(scene, 45, 8); // Table 2

        // 4. THE MIRROR (Store Room)
        this.addMirror(scene, -59.5, 3, 0);
    },

    createRoom(scene, x, z, col, name) {
        const size = 40;
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshPhongMaterial({ color: col })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        // Grid for movement reference
        const grid = new THREE.GridHelper(size, 20, 0x555555, 0x333333);
        grid.position.set(x, 0.01, z);
        scene.add(grid);

        // Solid Walls (Audit: No walking through these)
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const walls = [
            { s: [size, 8, 0.5], p: [x, 4, z - 20] }, // North
            { s: [size, 8, 0.5], p: [x, 4, z + 20] }, // South
            { s: [0.5, 8, size], p: [x - 20, 4, z] }, // West
            { s: [0.5, 8, size], p: [x + 20, 4, z] }  // East
        ];
        walls.forEach(w => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...w.s), wallMat);
            wall.position.set(...w.p);
            scene.add(wall);
            this.colliders.push(new THREE.Box3().setFromObject(wall));
        });
    },

    addTable(scene, x, z) {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.4),
            new THREE.MeshPhongMaterial({ color: 0x076324 })
        );
        table.position.set(x, 0.8, z);
        scene.add(table);
        this.colliders.push(new THREE.Box3().setFromObject(table));
    },

    addMirror(scene, x, y, z) {
        const mirror = new Reflector(new THREE.PlaneGeometry(6, 8), {
            clipBias: 0.003, color: 0x888888
        });
        mirror.position.set(x, y, z);
        mirror.rotation.y = Math.PI / 2;
        scene.add(mirror);
    }
};
