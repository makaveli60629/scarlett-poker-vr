import * as THREE from 'three';

export const World = {
    textureLoader: new THREE.TextureLoader(),

    loadTex(file, fallbackColor) {
        const path = `assets/textures/${file}`;
        const texture = this.textureLoader.load(path, 
            (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); },
            undefined, 
            () => {} 
        );
        return new THREE.MeshStandardMaterial({
            map: texture.image ? texture : null,
            color: texture.image ? 0xffffff : fallbackColor,
            roughness: 0.8
        });
    },

    build(scene) {
        // 1. CRITICAL LIGHTING: If this is too low, everything is black.
        scene.background = new THREE.Color(0x020205);
        scene.add(new THREE.AmbientLight(0xffffff, 1.0)); // Boosted for visibility
        
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(5, 10, 5);
        scene.add(sun);

        // 2. MATERIALS
        const mats = {
            carpet: this.loadTex('carpet_red.jpg', 0x660000),
            brick: this.loadTex('brick_wall.jpg', 0x444444), // Lighter grey fallback
            felt: this.loadTex('felt_green.jpg', 0x076324),
            gold: this.loadTex('gold_trim.jpg', 0xffd700)
        };

        // 3. THE FLOOR (Lowered to -0.1 to avoid flickering)
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mats.carpet);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1; 
        scene.add(floor);

        // 4. THE ROOMS (Moved back so they don't spawn on top of you)
        this.createRoom(scene, 0, 0, 20, mats.brick);    // Main Lobby
        this.createRoom(scene, 25, 0, 15, mats.brick);   // Poker Room

        // 5. PROPS
        this.createTable(scene, 0, -2, mats.felt); // Table right in front of spawn
        
        const safe = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), mats.gold);
        safe.position.set(-3, 1, -3); // Safe in the corner
        scene.add(safe);
    },

    createRoom(scene, x, z, size, mat) {
        const wallGeo = new THREE.BoxGeometry(size, 5, 0.2);
        // We only build 3 walls so the rooms feel connected and open
        const north = new THREE.Mesh(wallGeo, mat);
        north.position.set(x, 2.5, z - size/2);
        scene.add(north);

        const east = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, size), mat);
        east.position.set(x + size/2, 2.5, z);
        scene.add(east);

        const west = east.clone();
        west.position.x = x - size/2;
        scene.add(west);
    },

    createTable(scene, x, z, mat) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 16), mat);
        table.position.set(x, 1, z);
        scene.add(table);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 8), new THREE.MeshStandardMaterial({color:0x000000}));
        leg.position.set(x, 0.5, z);
        scene.add(leg);
    }
};
