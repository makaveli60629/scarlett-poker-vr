import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    colliders: [],

    build(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 3.0));
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(5, 15, 5);
        scene.add(sun);

        this.createRoom(scene, 0, 0, 0x111111, 'lobby_carpet.jpg'); // Lobby
        this.createRoom(scene, 60, 0, 0x076324, 'table_felt.jpg');  // Poker
        this.addFurniture(scene);
    },

    addFurniture(scene) {
        // Poker Table with Leather Trim
        const tableGroup = new THREE.Group();
        tableGroup.position.set(60, 0, 0);

        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.3, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        felt.position.y = 0.7;
        
        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.15, 16, 100),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a }) 
        );
        trim.rotation.x = Math.PI/2;
        trim.position.y = 0.85;

        tableGroup.add(felt, trim);
        scene.add(tableGroup);
    },

    createRoom(scene, x, z, col, tex) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: col }));
        floor.position.set(x, 0, z);
        floor.rotation.x = -Math.PI/2;
        scene.add(floor);
        
        // Boundaries
        const wallGeo = new THREE.BoxGeometry(40, 6, 0.5);
        const wallPositions = [[x, 3, z-20], [x, 3, z+20], [x-20, 3, z], [x+20, 3, z]];
        wallPositions.forEach((p, i) => {
            const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
            wall.position.set(...p);
            if(i > 1) wall.rotation.y = Math.PI/2;
            scene.add(wall);
            this.colliders.push(new THREE.Box3().setFromObject(wall));
        });
    }
};
