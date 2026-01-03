import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        this.addExtremeLighting(scene);
        
        // 4 Rooms (40m x 40m each) - Twice the size
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111);
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505);
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505);
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505);
        
        // Add Poker Table in the Poker Room
        this.addTable(scene, 60, 0);
    },

    addExtremeLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 3.0)); // Blindingly bright ambient
        const sun = new THREE.DirectionalLight(0xffffff, 2.5);
        sun.position.set(10, 25, 10);
        scene.add(sun);
    },

    createMegaRoom(scene, name, x, z, floorCol) {
        const size = 40;
        const height = 6;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Floor (Lobby Carpet texture from assets/textures/)
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({
                color: floorCol, 
                map: loader.load('assets/textures/lobby_carpet.jpg')
            })
        );
        floor.rotation.x = -Math.PI/2;
        group.add(floor);

        // High Ceilings (6m)
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({color: 0x222222})
        );
        ceiling.position.y = height;
        ceiling.rotation.x = Math.PI/2;
        group.add(ceiling);

        // Walls with Brick Texture and Purple Neon Trim
        const wallMat = new THREE.MeshStandardMaterial({ 
            map: loader.load('assets/textures/brickwall.jpg') 
        });

        const wallConfigs = [
            { p: [0, 3, -size/2], r: [0, 0, 0] },
            { p: [0, 3, size/2], r: [0, Math.PI, 0] },
            { p: [-size/2, 3, 0], r: [0, Math.PI/2, 0] },
            { p: [size/2, 3, 0], r: [0, -Math.PI/2, 0] }
        ];

        wallConfigs.forEach(conf => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, 0.5), wallMat);
            wall.position.set(...conf.p);
            wall.rotation.set(...conf.r);
            group.add(wall);
            this.applyNeon(wall, size, height);
        });

        scene.add(group);
    },

    applyNeon(wall, w, h) {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xa020f0 }); // Purple Neon
        const thickness = 0.15;

        // Top edge
        const t = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, thickness), neonMat);
        t.position.set(0, h/2, 0.3);
        // Bottom edge
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, thickness), neonMat);
        b.position.set(0, -h/2, 0.3);
        // Vertical edges
        const l = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, thickness), neonMat);
        l.position.set(-w/2, 0, 0.3);
        const r = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, thickness), neonMat);
        r.position.set(w/2, 0, 0.3);

        wall.add(t, b, l, r);
    },

    addTable(scene, x, z) {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        table.position.set(x, 0.8, z);
        scene.add(table);
    }
};
