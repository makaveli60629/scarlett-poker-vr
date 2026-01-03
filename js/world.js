import * as THREE from 'three';

export const World = {
    textureLoader: new THREE.TextureLoader(),

    // Texture guard: loads texture or fallback color
    loadTex(file, fallbackColor) {
        const path = `assets/textures/${file}`;
        const texture = this.textureLoader.load(
            path,
            (t) => {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(2, 2);
                t.anisotropy = 4;
            },
            undefined,
            () => console.warn(`Fallback: ${file} missing.`)
        );
        return new THREE.MeshStandardMaterial({
            map: texture.image ? texture : null,
            color: texture.image ? 0xffffff : fallbackColor,
            roughness: 0.9
        });
    },

    build(scene, playerGroup) {
        // Player spawn
        playerGroup.position.set(0, 0, 5);

        // Sky & Fog
        scene.background = new THREE.Color(0x020205);
        scene.fog = new THREE.Fog(0x020205, 1, 50);

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 5);
        scene.add(sun);

        // Materials
        const mats = {
            carpet: this.loadTex('carpet_red.jpg', 0x660000),
            brick: this.loadTex('brick_wall.jpg', 0x222222),
            feltGreen: this.loadTex('felt_green.jpg', 0x076324),
            feltBlack: this.loadTex('felt_black.jpg', 0x000000),
            gold: this.loadTex('gold_trim.jpg', 0xffd700),
            ceiling: this.loadTex('ceiling_tile.jpg', 0x111111),
        };

        // FLOOR (single large mesh)
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mats.carpet);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        scene.add(floor);

        // Rooms (merged groups)
        this.createRoom(scene, 0, 0, 15, mats.brick, mats.ceiling, "Lobby");
        this.createRoom(scene, 20, 0, 12, mats.brick, mats.ceiling, "Poker");
        this.createRoom(scene, -20, 0, 12, mats.brick, mats.ceiling, "Store");
        this.createRoom(scene, 0, 20, 12, mats.brick, mats.ceiling, "Vault");

        // Safe (optimized)
        const safe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.5), mats.gold);
        safe.position.set(0, 1.25, 20);
        scene.add(safe);

        // Poker Table (optimized low-poly)
        this.createTable(scene, 20, 0, mats.feltGreen);
    },

    createRoom(scene, x, z, size, wallMat, ceilingMat, name) {
        const room = new THREE.Group();

        // Walls
        const wallThickness = 0.2;
        const wallHeight = 5;

        const north = new THREE.Mesh(new THREE.BoxGeometry(size, wallHeight, wallThickness), wallMat);
        north.position.set(0, wallHeight/2, -size/2);
        room.add(north);

        const south = new THREE.Mesh(new THREE.BoxGeometry(size, wallHeight, wallThickness), wallMat);
        south.position.set(0, wallHeight/2, size/2);
        room.add(south);

        const east = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, size), wallMat);
        east.position.set(size/2, wallHeight/2, 0);
        room.add(east);

        const west = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, size), wallMat);
        west.position.set(-size/2, wallHeight/2, 0);
        room.add(west);

        // Ceiling
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilingMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = wallHeight;
        room.add(ceil);

        // Position the room
        room.position.set(x, 0, z);
        scene.add(room);
    },

    createTable(scene, x, z, mat) {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2, 16), mat);
        top.position.set(x, 1, z);
        scene.add(top);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 1, 12), new THREE.MeshStandardMaterial({color:0x000000}));
        base.position.set(x, 0.5, z);
        scene.add(base);
    }
};
