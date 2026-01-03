import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        this.addUltraBrightLights(scene);
        
        // 4 Rooms: Twice the size (40m each), 4 walls, Neon Edges
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111);
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505);
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505);
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505);
    },

    addUltraBrightLights(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 2.5)); // Extreme brightness
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(10, 20, 10);
        scene.add(sun);
    },

    createMegaRoom(scene, name, x, z, floorCol) {
        const size = 40; // Doubled Size
        const height = 6; // High ceilings
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Floor & Ceiling
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: floorCol, map: loader.load('assets/textures/lobby_carpet.jpg')}));
        floor.rotation.x = -Math.PI/2;
        
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x222222}));
        ceiling.position.y = height;
        ceiling.rotation.x = Math.PI/2;
        group.add(floor, ceiling);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ map: loader.load('assets/textures/brickwall.jpg') });
        const wallData = [
            { pos: [0, height/2, -size/2], rot: [0, 0, 0] },
            { pos: [0, height/2, size/2], rot: [0, Math.PI, 0] },
            { pos: [-size/2, height/2, 0], rot: [0, Math.PI/2, 0] },
            { pos: [size/2, height/2, 0], rot: [0, -Math.PI/2, 0] }
        ];

        wallData.forEach(d => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, 0.5), wallMat);
            wall.position.set(...d.pos);
            wall.rotation.set(...d.rot);
            group.add(wall);

            // PURPLE NEON TRIM (Top, Bottom, and Sides)
            this.addNeonTrim(wall, size, height);
        });

        scene.add(group);
    },

    addNeonTrim(wall, w, h) {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xa020f0 }); // Purple Neon
        const thickness = 0.1;

        // Top & Bottom Trim
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, thickness), neonMat);
        top.position.y = h/2;
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, thickness), neonMat);
        bottom.position.y = -h/2;

        // Left & Right Trim
        const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, thickness), neonMat);
        left.position.x = -w/2;
        const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, thickness), neonMat);
        right.position.x = w/2;

        wall.add(top, bottom, left, right);
    }
};
