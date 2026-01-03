import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const World = {
    colliders: [],

    build(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        
        // 4-Room Layout (Centers)
        this.createRoom(scene, 0, 0, 0x111111, "Lobby");      // Center
        this.createRoom(scene, 40, 0, 0x076324, "Poker Room"); // East
        this.createRoom(scene, -40, 0, 0x1a1a1a, "Store");    // West
        this.createRoom(scene, 0, 40, 0x050505, "Vault");     // North

        // The Mirror (Store Room)
        const mirror = new Reflector(new THREE.PlaneGeometry(4, 7), {
            clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x888888
        });
        mirror.position.set(-59.8, 3.5, 0); 
        mirror.rotation.y = Math.PI / 2;
        scene.add(mirror);

        // Neon Purple Pillars (Lobby)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-8,-8], [8,-8], [-8,8], [8,8]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // Poker Table with Leather Trim
        this.addPokerTable(scene, 40, 0);
    },

    createRoom(scene, x, z, col, name) {
        const size = 40;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshPhongMaterial({ color: col }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        // Physical Walls
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const wallData = [
            { pos: [x, 4, z-20], size: [size, 8, 0.5] }, { pos: [x, 4, z+20], size: [size, 8, 0.5] },
            { pos: [x-20, 4, z], size: [0.5, 8, size] }, { pos: [x+20, 4, z], size: [0.5, 8, size] }
        ];
        wallData.forEach(d => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...d.size), wallMat);
            wall.position.set(...d.pos);
            scene.add(wall);
            this.colliders.push(new THREE.Box3().setFromObject(wall));
        });
    },

    addPokerTable(scene, x, z) {
        const table = new THREE.Group();
        table.position.set(x, 0, z);
        const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.4), new THREE.MeshPhongMaterial({color: 0x076324}));
        felt.position.y = 0.8;
        const trim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.15), new THREE.MeshPhongMaterial({color: 0x111111}));
        trim.rotation.x = Math.PI/2; trim.position.y = 1.0;
        table.add(felt, trim);
        scene.add(table);
        this.colliders.push(new THREE.Box3().setFromObject(felt));
    }
};
