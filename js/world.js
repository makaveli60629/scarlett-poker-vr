import * as THREE from 'three';

export const World = {

    textureLoader: new THREE.TextureLoader(),

    // TEXTURE GUARD
    getSafeMaterial(textureName, fallbackColor) {
        const path = `assets/textures/${textureName}`;
        try {
            const tex = this.textureLoader.load(
                path,
                undefined,
                undefined,
                () => console.warn(`⚠ Missing texture: ${path}. Using fallback color.`)
            );
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1, 1);
            return new THREE.MeshStandardMaterial({ map: tex, color: fallbackColor });
        } catch {
            return new THREE.MeshStandardMaterial({ color: fallbackColor });
        }
    },

    build(scene, playerGroup) {

        /* ======================
           PLAYER SPAWN
        ======================= */
        playerGroup.position.set(0, 1.6, 0); // Safe eye height

        /* ======================
           ENVIRONMENT
        ======================= */
        scene.background = new THREE.Color(0x101010);
        scene.fog = new THREE.Fog(0x101010, 10, 100);

        scene.add(new THREE.AmbientLight(0xffffff, 1));

        // Ceiling grid lights
        for (let x = -20; x <= 20; x += 5) {
            for (let z = -20; z <= 20; z += 5) {
                const light = new THREE.PointLight(0xffffff, 0.7, 30);
                light.position.set(x, 7, z);
                scene.add(light);
            }
        }

        /* ======================
           TEXTURES
        ======================= */
        const carpetRed = this.getSafeMaterial('carpet_red.jpg', 0x550000);
        const brickWall = this.getSafeMaterial('brick_wall.jpg', 0x333333);
        const feltGreen = this.getSafeMaterial('felt_green.jpg', 0x0b6623);
        const feltBlack = this.getSafeMaterial('felt_black.jpg', 0x111111);
        const goldTrim = this.getSafeMaterial('gold_trim.jpg', 0xffd700);
        const skyTex = this.getSafeMaterial('sky_space.jpg', 0x000000);

        /* ======================
           ROOMS
        ======================= */
        this.createRoom(scene, "Lobby", 0, 0, 20, carpetRed, brickWall);
        this.createRoom(scene, "Poker", 25, 0, 15, feltGreen, brickWall);
        this.createRoom(scene, "Store", -25, 0, 15, feltBlack, brickWall);
        this.createRoom(scene, "Vault", 0, 25, 15, carpetRed, brickWall);

        /* ======================
           CEILING PANELS
        ======================= */
        this.createCeilingPanels(scene, 0, 0, 20);
        this.createCeilingPanels(scene, 25, 0, 15);
        this.createCeilingPanels(scene, -25, 0, 15);
        this.createCeilingPanels(scene, 0, 25, 15);

        /* ======================
           TABLES
        ======================= */
        this.createPokerTable(scene, 25, 0, feltGreen);
        this.createPokerTable(scene, 27, -4, feltBlack);
        this.createLobbyTable(scene, 0, 0);

        // Chairs
        this.createChair(scene, 24, 0, 2);
        this.createChair(scene, 26, 0, 2);
        this.createChair(scene, 25, 0, -2);
        this.createChair(scene, 25, 0, 2);

        /* ======================
           SLOT MACHINES
        ======================= */
        this.createSlotMachine(scene, 5, 0, -5);
        this.createSlotMachine(scene, -5, 0, -5);
        this.createSlotMachine(scene, 10, 0, -5);

        /* ======================
           ROULETTE TABLE
        ======================= */
        this.createRouletteTable(scene, -10, 0, -5);

        /* ======================
           BAR & VIP
        ======================= */
        this.createBar(scene, -15, 0, 5);
        this.createVIPLounge(scene, 15, 0, 5);

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
    },

    createRoom(scene, name, x, z, size, floorMat, wallMat) {
        const roomGroup = new THREE.Group();

        // Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
        floor.rotation.x = -Math.PI / 2;
        roomGroup.add(floor);

        // Ceiling
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = 8;
        roomGroup.add(ceil);

        // Walls
        const wallGeoX = new THREE.BoxGeometry(size, 8, 1);
        const wallGeoZ = new THREE.BoxGeometry(1, 8, size);
        const walls = [
            new THREE.Mesh(wallGeoX, wallMat), // front
            new THREE.Mesh(wallGeoX, wallMat), // back
            new THREE.Mesh(wallGeoZ, wallMat), // left
            new THREE.Mesh(wallGeoZ, wallMat)  // right
        ];
        walls[0].position.set(0, 4, -size / 2);
        walls[1].position.set(0, 4, size / 2);
        walls[2].position.set(-size / 2, 4, 0);
        walls[3].position.set(size / 2, 4, 0);
        walls.forEach(w => roomGroup.add(w));

        // Room light
        const light = new THREE.PointLight(0xffffff, 1, size);
        light.position.set(0, 7, 0);
        roomGroup.add(light);

        roomGroup.position.set(x, 0, z);
        scene.add(roomGroup);
    },

    createCeilingPanels(scene, x, z, size) {
        const panelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, emissiveIntensity: 0.8 });
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

    createPokerTable(scene, x, z, feltMat) {
        const group = new THREE.Group();
        const top = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.3, 32), feltMat);
        top.scale.z = 1.6;
        top.position.y = 1;
        group.add(top);
        const trim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.15, 16, 32), new THREE.MeshStandardMaterial({ color: 0x3b2f2f }));
        trim.rotation.x = Math.PI / 2;
        trim.scale.z = 1.6;
        trim.position.y = 1.05;
        group.add(trim);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        leg.position.set(2, 0.5, 0);
        group.add(leg);
        group.position.set(x, 0, z);
        scene.add(group);
    },

    createLobbyTable(scene, x, z) {
        const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        table.position.set(x, 1, z);
        scene.add(table);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        base.position.set(x, 0.5, z);
        scene.add(base);
    },

    createChair(scene, x, y, z) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        seat.position.set(x, y + 0.6, z);
        scene.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        back.position.set(x, y + 0.95, z - 0.2);
        scene.add(back);
    },

    createSlotMachine(scene, x, y, z) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.5), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        body.position.set(x, 1, z);
        scene.add(body);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
        screen.position.set(x, 1.1, z + 0.26);
        scene.add(screen);
    },

    createRouletteTable(scene, x, y, z) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0x006400 }));
        table.position.set(x, 1, z);
        table.rotation.x = Math.PI / 2;
        scene.add(table);
    },

    createBar(scene, x, y, z) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 1), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        bar.position.set(x, 1, z);
        scene.add(bar);
    },

    createVIPLounge(scene, x, y, z) {
        const lounge = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        lounge.position.set(x, 0.5, z);
        scene.add(lounge);
    }
};
