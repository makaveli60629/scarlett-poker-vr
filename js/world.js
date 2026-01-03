import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const loader = new THREE.TextureLoader();

export const World = {
    colliders: [], // Array for index.js to check for movement blocks

    build(scene) {
        // --- 1. LIGHTING AUDIT (High Visibility) ---
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(10, 20, 10);
        scene.add(sun);

        // --- 2. ROOM CREATION (Audit: Lobby, Poker, Store, Vault) ---
        this.createRoom(scene, 0, 0, 0x222222, "Lobby", 'lobby_carpet.jpg');    
        this.createRoom(scene, 40, 0, 0x076324, "Poker Room", 'poker_felt.jpg'); 
        this.createRoom(scene, -40, 0, 0x111111, "Store", 'brickwall.jpg');    
        this.createRoom(scene, 0, 40, 0x050505, "Vault", 'concrete.jpg');      

        // --- 3. THE LOBBY PILLARS (Audit: Neon Purple) ---
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-8,-8], [8,-8], [-8,8], [8,8]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // --- 4. POKER ROOM ASSETS (Audit: Leather Trim & Interaction) ---
        this.addPokerTable(scene, 40, 0);
        this.addPokerTable(scene, 45, 10); // Second table as requested

        // --- 5. STORE ROOM ASSETS (Audit: Mirror) ---
        this.addMirror(scene, -59.5, 3, 0); 
    },

    createRoom(scene, x, z, col, label, tex) {
        const size = 40;
        const height = 8;

        // Floor with Texture Audit
        const floorGeo = new THREE.PlaneGeometry(size, size);
        const floorMat = new THREE.MeshPhongMaterial({ 
            color: col, 
            map: tex ? loader.load(`assets/textures/${tex}`) : null 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        // Solid Walls (Audit: No-clip prevention)
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const wallData = [
            { s: [size, height, 1], p: [x, height/2, z - size/2] }, // North
            { s: [size, height, 1], p: [x, height/2, z + size/2] }, // South
            { s: [1, height, size], p: [x - size/2, height/2, z] }, // West
            { s: [1, height, size], p: [x + size/2, height/2, z] }  // East
        ];

        wallData.forEach(data => {
            // Create visible wall
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...data.s), wallMat);
            wall.position.set(...data.p);
            scene.add(wall);
            // Create physical collider
            const box = new THREE.Box3().setFromObject(wall);
            this.colliders.push(box);
        });
    },

    addPokerTable(scene, x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Main Table (Felt)
        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.4, 32),
            new THREE.MeshPhongMaterial({ color: 0x076324 })
        );
        felt.position.y = 0.8;

        // Leather Trim Audit
        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.15, 16, 100),
            new THREE.MeshPhongMaterial({ color: 0x1a1a1a })
        );
        trim.rotation.x = Math.PI/2;
        trim.position.y = 1.0;

        group.add(felt, trim);
        scene.add(group);

        // Add table to colliders so you can't walk through it
        this.colliders.push(new THREE.Box3().setFromObject(felt));
    },

    addMirror(scene, x, y, z) {
        const mirror = new Reflector(new THREE.PlaneGeometry(6, 8), {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x888888
        });
        mirror.position.set(x, y, z);
        mirror.rotation.y = Math.PI / 2;
        scene.add(mirror);
    }
};
