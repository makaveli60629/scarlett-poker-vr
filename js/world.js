import * as THREE from 'three';

export const World = {

    textureLoader: new THREE.TextureLoader(),

    loadTexture(path, fallbackColor = 0xff00ff) {
        let mat;
        try {
            const tex = this.textureLoader.load(
                path,
                undefined,
                undefined,
                () => console.warn(`⚠ Missing texture: ${path}`)
            );
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1, 1);
            mat = new THREE.MeshStandardMaterial({ map: tex });
        } catch (e) {
            mat = new THREE.MeshStandardMaterial({ color: fallbackColor });
        }
        return mat;
    },

    build(scene, playerGroup) {

        /* ======================
           PLAYER SPAWN
        ======================= */
        playerGroup.position.set(0, 1.6, 0); // Spawn in lobby center at eye height

        /* ======================
           ENVIRONMENT
        ======================= */
        scene.background = new THREE.Color(0x101010);
        scene.fog = new THREE.Fog(0x101010, 10, 100);

        scene.add(new THREE.AmbientLight(0xffffff, 1.0));

        // Ceiling point lights grid
        for (let x = -20; x <= 20; x += 5) {
            for (let z = -20; z <= 20; z += 5) {
                const light = new THREE.PointLight(0xffffff, 0.8, 30);
                light.position.set(x, 7.5, z);
                scene.add(light);
            }
        }

        /* ======================
           MATERIALS
        ======================= */
        const carpetRed = this.loadTexture('./assets/textures/carpet_red.jpg', 0x550000);
        const brickWall = this.loadTexture('./assets/textures/brick_wall.jpg', 0x333333);
        const feltGreen = this.loadTexture('./assets/textures/felt_green.jpg', 0x0b6623);
        const feltBlack = this.loadTexture('./assets/textures/felt_black.jpg', 0x111111);
        const goldTrim = this.loadTexture('./assets/textures/gold_trim.jpg', 0xffd700);

        /* ======================
           ROOMS
        ======================= */
        this.createRoom(scene, 0, 0, 20, carpetRed, brickWall);   // Lobby (spawn area)
        this.createRoom(scene, 25, 0, 15, feltGreen, brickWall);  // Poker
        this.createRoom(scene, -25, 0, 15, feltBlack, brickWall); // Store
        this.createRoom(scene, 0, 25, 15, carpetRed, brickWall);  // Vault

        /* ======================
           CEILING PANELS
        ======================= */
        this.createCeilingPanels(scene, 0, 0, 20);
        this.createCeilingPanels(scene, 25, 0, 15);
        this.createCeilingPanels(scene, -25, 0, 15);
        this.createCeilingPanels(scene, 0, 25, 15);

        /* ======================
           TABLES (spawn area clear)
        ======================= */
        this.createPokerTable(scene, 25, 0, feltGreen);  // Poker Table
        this.createPokerTable(scene, 27, -4, feltBlack); // High Roller
        this.createLobbyTable(scene, 0, 0);             // Daily Reward Table in center

        /* ======================
           VAULT SAFE
        ======================= */
        const safe = new THREE.Mesh(
            new THREE.BoxGeometry(2, 3, 2),
            goldTrim
        );
        safe.position.set(0, 1.5, 25);
        scene.add(safe);

        const vaultLight = new THREE.PointLight(0xffd700, 1.5, 15);
        vaultLight.position.set(0, 4, 25);
        scene.add(vaultLight);

        /* ======================
           ADDITIONAL OBJECTS (Casino style)
           - Optional extras can be added later
        ======================= */
        // Example: Low-poly chairs around poker table
        this.createChair(scene, 24, 0, 2);
        this.createChair(scene, 26, 0, 2);
        this.createChair(scene, 25, 0, -2);
        this.createChair(scene, 25, 0, 2);
    },

    /* ======================
       ROOM BUILDER
    ======================= */
    createRoom(scene, x, z, size, floorMat, wallMat) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);

        const ceiling = floor.clone();
        ceiling.position.y = 8;
        ceiling.rotation.x = Math.PI / 2;
        scene.add(ceiling);

        // Walls
        const wallGeo = new THREE.BoxGeometry(size, 8, 1);
        const wall1 = new THREE.Mesh(wallGeo, wallMat);
        wall1.position.set(x, 4, z - size / 2);
        scene.add(wall1);

        const wall2 = wall1.clone();
        wall2.position.z = z + size / 2;
        scene.add(wall2);

        const wall3 = new THREE.Mesh(new THREE.BoxGeometry(1, 8, size), wallMat);
        wall3.position.set(x - size / 2, 4, z);
        scene.add(wall3);

        const wall4 = wall3.clone();
        wall4.position.x = x + size / 2;
        scene.add(wall4);
    },

    /* ======================
       CEILING PANELS
    ======================= */
    createCeilingPanels(scene, x, z, size) {
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x222222,
            emissiveIntensity: 0.8
        });
        const panelGeo = new THREE.PlaneGeometry(4, 4);
        for (let i = -size / 2; i < size / 2; i += 5) {
            for (let j = -size / 2; j < size / 2; j += 5) {
                const panel = new THREE.Mesh(panelGeo, panelMat);
                panel.rotation.x = Math.PI / 2;
                panel.position.set(x + i, 7.9, z + j);
                scene.add(panel);
            }
        }
    },

    /* ======================
       POKER TABLES
    ======================= */
    createPokerTable(scene, x, z, feltMat) {
        const tableGroup = new THREE.Group();

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(3.5, 3.5, 0.3, 32),
            feltMat
        );
        top.scale.z = 1.6;
        top.position.y = 1;
        tableGroup.add(top);

        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(3.6, 0.15, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0x3b2f2f })
        );
        trim.rotation.x = Math.PI / 2;
        trim.scale.z = 1.6;
        trim.position.y = 1.05;
        tableGroup.add(trim);

        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 1),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        leg.position.set(2, 0.5, 0);
        tableGroup.add(leg);

        tableGroup.position.set(x, 0, z);
        scene.add(tableGroup);
    },

    /* ======================
       LOBBY TABLE
    ======================= */
    createLobbyTable(scene, x, z) {
        const table = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.3, 2),
            new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        table.position.set(x, 1, z);
        scene.add(table);

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.6, 1),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        base.position.set(x, 0.5, z);
        scene.add(base);
    },

    /* ======================
       SIMPLE CHAIRS
    ======================= */
    createChair(scene, x, y, z) {
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.2, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        seat.position.set(x, y + 0.6, z);
        scene.add(seat);

        const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        back.position.set(x, y + 0.95, z - 0.2);
        scene.add(back);
    }
};
