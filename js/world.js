import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        this.addExtremeLighting(scene);
        
        // 4 Mega Rooms (40m x 40m) - Scale x2
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111, 'lobby_carpet.jpg');
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505, 'table_felt.jpg');
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505, 'lobby_carpet.jpg');
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505, 'brickwall.jpg');

        this.addCasinoArt(scene);
        this.addPokerTable(scene);
        this.addStorePortal(scene);
    },

    addExtremeLighting(scene) {
        // High intensity prevents black screen in VR
        scene.add(new THREE.AmbientLight(0xffffff, 3.0));
        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(10, 25, 10);
        scene.add(sun);
    },

    addCasinoArt(scene) {
        // Art with Gold Frames on Lobby Walls
        const art1 = this.createFrame('casino_art.jpg', 4, 3);
        art1.position.set(-8, 3, -19.7);
        scene.add(art1);

        const art2 = this.createFrame('casino_art_2.jpg', 4, 3);
        art2.position.set(8, 3, -19.7);
        scene.add(art2);
    },

    createFrame(texFile, w, h) {
        const group = new THREE.Group();
        const pic = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshStandardMaterial({ map: loader.load(`assets/textures/${texFile}`) })
        );
        const goldFrame = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 })
        );
        goldFrame.position.z = -0.07;
        group.add(pic, goldFrame);
        return group;
    },

    addPokerTable(scene) {
        const group = new THREE.Group();
        group.position.set(60, 0.8, 0); // Center of Poker Room
        
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.15, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324, map: loader.load('assets/textures/table_felt.jpg') })
        );
        group.add(table);
        scene.add(group);
    },

    addStorePortal(scene) {
        // Store Portal at (-60, 2, -15)
        const portalGeo = new THREE.TorusGeometry(1.8, 0.1, 16, 100);
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
        const portal = new THREE.Mesh(portalGeo, portalMat);
        portal.position.set(-60, 2, -15);
        scene.add(portal);
    },

    createMegaRoom(scene, name, x, z, floorCol, texFile) {
        const size = 40;
        const height = 6;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({ color: floorCol, map: loader.load(`assets/textures/${texFile}`) })
        );
        floor.rotation.x = -Math.PI/2;
        
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        ceiling.position.y = height;
        ceiling.rotation.x = Math.PI/2;
        group.add(floor, ceiling);

        // 4 Walls with Purple Neon Trim
        const wallConfigs = [
            { p: [0, 3, -20], r: [0, 0, 0] },
            { p: [0, 3, 20], r: [0, Math.PI, 0] },
            { p: [-20, 3, 0], r: [0, Math.PI/2, 0] },
            { p: [20, 3, 0], r: [0, -Math.PI/2, 0] }
        ];

        wallConfigs.forEach(c => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, 0.4), new THREE.MeshStandardMaterial({ map: loader.load('assets/textures/brickwall.jpg') }));
            wall.position.set(...c.p);
            wall.rotation.set(...c.r);
            group.add(wall);
            this.applyNeon(wall, size, height);
        });

        scene.add(group);
    },

    applyNeon(wall, w, h) {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xa020f0 });
        const t = 0.15;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), neonMat);
        top.position.set(0, h/2, 0.25);
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), neonMat);
        bottom.position.set(0, -h/2, 0.25);
        wall.add(top, bottom);
    }
};
