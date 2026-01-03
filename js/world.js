import * as THREE from 'three';

export const World = {
    build(scene) {
        this.addUltraBrightLights(scene);
        
        // 4 Rooms: 40m x 40m (Twice the size), Ceiling at 6m
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111);
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505);
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505);
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505);
    },

    addUltraBrightLights(scene) {
        // High-Intensity lighting to kill shadows
        scene.add(new THREE.AmbientLight(0xffffff, 2.5)); 
        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(10, 20, 10);
        scene.add(sun);
    },

    createMegaRoom(scene, name, x, z, floorCol) {
        const size = 40;
        const height = 6;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Floor and Ceiling
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: floorCol}));
        floor.rotation.x = -Math.PI/2;
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x222222}));
        ceiling.position.y = height;
        ceiling.rotation.x = Math.PI/2;
        group.add(floor, ceiling);

        // 4 Walls with Neon Purple Trim
        const wallData = [
            { pos: [0, height/2, -size/2], rot: [0, 0, 0] },
            { pos: [0, height/2, size/2], rot: [0, Math.PI, 0] },
            { pos: [-size/2, height/2, 0], rot: [0, Math.PI/2, 0] },
            { pos: [size/2, height/2, 0], rot: [0, -Math.PI/2, 0] }
        ];

        wallData.forEach(d => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, 0.5), new THREE.MeshStandardMaterial({color: 0x333333}));
            wall.position.set(...d.pos);
            wall.rotation.set(...d.rot);
            group.add(wall);
            this.addPurpleNeon(wall, size, height);
        });

        scene.add(group);
    },

    addPurpleNeon(wall, w, h) {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xa020f0 }); // Purple Neon
        const thickness = 0.15;

        const top = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, thickness), neonMat);
        top.position.set(0, h/2, 0.3);
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, thickness), neonMat);
        bottom.position.set(0, -h/2, 0.3);
        const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, thickness), neonMat);
        left.position.set(-w/2, 0, 0.3);
        const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, thickness), neonMat);
        right.position.set(w/2, 0, 0.3);

        wall.add(top, bottom, left, right);
    }
};
