import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        this.addExtremeLighting(scene);
        
        // 4 Rooms (40m x 40m) - Double Size
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111);
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505);
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505);
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505);
    },

    addExtremeLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 3.0)); // Maximum brightness
        const sun = new THREE.DirectionalLight(0xffffff, 2.5);
        sun.position.set(10, 25, 10);
        scene.add(sun);
    },

    createMegaRoom(scene, name, x, z, floorCol) {
        const size = 40;
        const height = 6;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Floor and Ceiling
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({color: floorCol, map: loader.load('assets/textures/lobby_carpet.jpg')})
        );
        floor.rotation.x = -Math.PI/2;
        
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({color: 0x222222})
        );
        ceiling.position.y = height;
        ceiling.rotation.x = Math.PI/2;
        group.add(floor, ceiling);

        // 4 Walls with Brick and Purple Neon
        const wallMat = new THREE.MeshStandardMaterial({ map: loader.load('assets/textures/brickwall.jpg') });
        const configs = [
            { p: [0, 3, -20], r: [0, 0, 0] },
            { p: [0, 3, 20], r: [0, Math.PI, 0] },
            { p: [-20, 3, 0], r: [0, Math.PI/2, 0] },
            { p: [20, 3, 0], r: [0, -Math.PI/2, 0] }
        ];

        configs.forEach(c => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, 0.5), wallMat);
            wall.position.set(...c.p);
            wall.rotation.set(...c.r);
            group.add(wall);
            this.applyPurpleNeon(wall, size, height);
        });

        scene.add(group);
    },

    applyPurpleNeon(wall, w, h) {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xa020f0 }); // Purple Neon
        const t = 0.15; // Thickness

        const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), neonMat);
        top.position.set(0, h/2, 0.3);
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), neonMat);
        bottom.position.set(0, -h/2, 0.3);
        const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), neonMat);
        left.position.set(-w/2, 0, 0.3);
        const right = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), neonMat);
        right.position.set(w/2, 0, 0.3);

        wall.add(top, bottom, left, right);
    }
};
import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        this.addExtremeLighting(scene);
        
        // 4 Rooms (40m x 40m) - Double Size
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111);
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505);
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505);
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505);
    },

    addExtremeLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 3.0)); // Maximum brightness
        const sun = new THREE.DirectionalLight(0xffffff, 2.5);
        sun.position.set(10, 25, 10);
        scene.add(sun);
    },

    createMegaRoom(scene, name, x, z, floorCol) {
        const size = 40;
        const height = 6;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Floor and Ceiling
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({color: floorCol, map: loader.load('assets/textures/lobby_carpet.jpg')})
        );
        floor.rotation.x = -Math.PI/2;
        
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size), 
            new THREE.MeshStandardMaterial({color: 0x222222})
        );
        ceiling.position.y = height;
        ceiling.rotation.x = Math.PI/2;
        group.add(floor, ceiling);

        // 4 Walls with Brick and Purple Neon
        const wallMat = new THREE.MeshStandardMaterial({ map: loader.load('assets/textures/brickwall.jpg') });
        const configs = [
            { p: [0, 3, -20], r: [0, 0, 0] },
            { p: [0, 3, 20], r: [0, Math.PI, 0] },
            { p: [-20, 3, 0], r: [0, Math.PI/2, 0] },
            { p: [20, 3, 0], r: [0, -Math.PI/2, 0] }
        ];

        configs.forEach(c => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, 0.5), wallMat);
            wall.position.set(...c.p);
            wall.rotation.set(...c.r);
            group.add(wall);
            this.applyPurpleNeon(wall, size, height);
        });

        scene.add(group);
    },

    applyPurpleNeon(wall, w, h) {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xa020f0 }); // Purple Neon
        const t = 0.15; // Thickness

        const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), neonMat);
        top.position.set(0, h/2, 0.3);
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), neonMat);
        bottom.position.set(0, -h/2, 0.3);
        const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), neonMat);
        left.position.set(-w/2, 0, 0.3);
        const right = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), neonMat);
        right.position.set(w/2, 0, 0.3);

        wall.add(top, bottom, left, right);
    }
};
