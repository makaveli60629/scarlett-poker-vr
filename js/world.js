import * as THREE from 'three';

export const World = {
    textureLoader: new THREE.TextureLoader(),

    // FIXED: Correct Async Loading
    loadTexture(path, fallbackColor = 0xff00ff) {
        const tex = this.textureLoader.load(
            path,
            (t) => { 
                t.wrapS = t.wrapT = THREE.RepeatWrapping; 
                t.repeat.set(4, 4); // Added repeat so it's not blurry
            },
            undefined,
            () => console.warn(`Missing: ${path}`)
        );
        return new THREE.MeshStandardMaterial({ 
            map: tex, 
            color: tex ? 0xffffff : fallbackColor 
        });
    },

    build(scene, playerGroup) {
        if (!playerGroup) {
            console.error("World.build error: playerGroup is missing!");
            return;
        }

        /* ======================
           PLAYER SPAWN (Fixed for VR)
        ======================= */
        playerGroup.position.set(0, 0, 0); // Floor level

        /* ======================
           ENVIRONMENT & LIGHTING (Optimized for Quest)
        ======================= */
        scene.background = new THREE.Color(0x101010);
        scene.add(new THREE.AmbientLight(0xffffff, 0.8)); // Higher ambient

        // Reduced lights to 4 High-Intensity Area Lights (Quest can handle this)
        const lightPositions = [[10, 7, 10], [-10, 7, 10], [10, 7, -10], [-10, 7, -10]];
        lightPositions.forEach(pos => {
            const light = new THREE.PointLight(0xffffff, 1.2, 40);
            light.position.set(pos[0], pos[1], pos[2]);
            scene.add(light);
        });

        /* ======================
           MATERIALS
        ======================= */
        const carpetRed = this.loadTexture('./assets/textures/carpet_red.jpg', 0x550000);
        const brickWall = this.loadTexture('./assets/textures/brick_wall.jpg', 0x333333);
        const feltGreen = this.loadTexture('./assets/textures/felt_green.jpg', 0x0b6623);
        const feltBlack = this.loadTexture('./assets/textures/felt_black.jpg', 0x111111);
        const goldTrim = this.loadTexture('./assets/textures/gold_trim.jpg', 0xffd700);

        /* ======================
           ROOMS & CONNECTORS
        ======================= */
        // Lobby
        this.createRoom(scene, 0, 0, 20, carpetRed, brickWall);   
        
        // Connecting Hallway (Missing in your code - prevents walking into void)
        this.createHallway(scene, 10, 0, 10, 4, carpetRed); 

        // Poker Room
        this.createRoom(scene, 25, 0, 15, feltGreen, brickWall);  
        // Store
        this.createRoom(scene, -25, 0, 15, feltBlack, brickWall); 
        // Vault
        this.createRoom(scene, 0, 25, 15, carpetRed, brickWall);  

        /* ======================
           OBJECTS (All preserved)
        ======================= */
        this.createPokerTable(scene, 25, 0, feltGreen);
        this.createPokerTable(scene, 27, -4, feltBlack);
        this.createLobbyTable(scene, 0, 0);

        // Vault Safe
        const safe = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), goldTrim);
        safe.position.set(0, 1.5, 25);
        scene.add(safe);

        // Chairs
        this.createChair(scene, 24, 0, 2);
        this.createChair(scene, 26, 0, 2);
        this.createChair(scene, 25, 0, -2);
        this.createChair(scene, 25, 0, 2.2);
    },

    createRoom(scene, x, z, size, floorMat, wallMat) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        const ceiling = floor.clone();
        ceiling.position.y = 8;
        ceiling.rotation.x = Math.PI / 2;
        scene.add(ceiling);

        // Walls (Using single meshes for performance)
        const wallGeoH = new THREE.BoxGeometry(size, 8, 0.2);
        const wallGeoV = new THREE.BoxGeometry(0.2, 8, size);

        const w1 = new THREE.Mesh(wallGeoH, wallMat); w1.position.set(x, 4, z - size/2); scene.add(w1);
        const w2 = new THREE.Mesh(wallGeoH, wallMat); w2.position.set(x, 4, z + size/2); scene.add(w2);
        const w3 = new THREE.Mesh(wallGeoV, wallMat); w3.position.set(x - size/2, 4, z); scene.add(w3);
        const w4 = new THREE.Mesh(wallGeoV, wallMat); w4.position.set(x + size/2, 4, z); scene.add(w4);
    },

    createHallway(scene, x, z, w, h, mat) {
        const hall = new THREE.Mesh(new THREE.PlaneGeometry(w, 4), mat);
        hall.rotation.x = -Math.PI / 2;
        hall.position.set(x, 0.01, z); // Slightly above floor to prevent flickering
        scene.add(hall);
    },

    createPokerTable(scene, x, z, feltMat) {
        const tableGroup = new THREE.Group();
        const top = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.3, 32), feltMat);
        top.scale.z = 1.6;
        top.position.y = 1;
        tableGroup.add(top);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 1), new THREE.MeshStandardMaterial({color:0x111111}));
        leg.position.y = 0.5;
        tableGroup.add(leg);

        tableGroup.position.set(x, 0, z);
        scene.add(tableGroup);
    },

    createLobbyTable(scene, x, z) {
        const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        table.position.set(x, 1, z);
        scene.add(table);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        base.position.set(x, 0.5, z);
        scene.add(base);
    },

    createChair(scene, x, y, z) {
        const chair = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        seat.position.y = 0.5;
        chair.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        back.position.set(0, 0.9, -0.25);
        chair.add(back);
        chair.position.set(x, y, z);
        scene.add(chair);
    }
};
