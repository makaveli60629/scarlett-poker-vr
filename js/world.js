import * as THREE from 'three';

export const World = {
    textureLoader: new THREE.TextureLoader(),
    grabbableObjects: [], // Objects that can be picked up

    loadTex(file, fallbackColor) {
        const path = `assets/textures/${file}`;
        const texture = this.textureLoader.load(
            path,
            (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5,5); },
            undefined,
            () => {}
        );

        return new THREE.MeshStandardMaterial({
            map: texture.image ? texture : null,
            color: texture.image ? 0xffffff : fallbackColor,
            roughness: 0.7,
            metalness: 0.2
        });
    },

    build(scene) {
        // --------------------
        // Mega Lighting Setup
        // --------------------
        scene.background = new THREE.Color(0x111122);
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));

        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(10, 20, 10);
        scene.add(sun);

        const pointLight = new THREE.PointLight(0xffffff, 2, 50);
        pointLight.position.set(0, 10, 0);
        scene.add(pointLight);

        // --------------------
        // Materials
        // --------------------
        const mats = {
            carpet: this.loadTex('carpet_red.jpg', 0x990000),
            brick: this.loadTex('brick_wall.jpg', 0x777777),
            felt: this.loadTex('felt_green.jpg', 0x076324),
            gold: this.loadTex('gold_trim.jpg', 0xffd700),
            wood: this.loadTex('wood_floor.jpg', 0x552200)
        };

        // --------------------
        // Floor
        // --------------------
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), mats.carpet);
        floor.rotation.x = -Math.PI/2;
        scene.add(floor);

        // --------------------
        // Rooms
        // --------------------
        this.createArea(scene, 0, 0, 30, mats.brick, "Lobby");
        this.createArea(scene, 40, 0, 20, mats.brick, "Poker Room");
        this.createArea(scene, -40, 0, 20, mats.brick, "Vault");

        // --------------------
        // Tables
        // --------------------
        this.createTable(scene, 0, -5, mats.felt);
        this.createTable(scene, 40, 0, mats.felt);

        // --------------------
        // Gold Safe
        // --------------------
        const safe = new THREE.Mesh(new THREE.BoxGeometry(2,3,2), mats.gold);
        safe.position.set(-40,1.5,0);
        scene.add(safe);

        // --------------------
        // UI Objects (cards, chips)
        // --------------------
        for(let i=0;i<5;i++){
            const card = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.01,0.75), mats.felt);
            card.position.set(0,1,i-2);
            card.userData.grabbable = true;
            scene.add(card);
            this.grabbableObjects.push(card);
        }
    },

    createArea(scene, x, z, size, mat, name="Area") {
        const wallGeo = new THREE.BoxGeometry(size, 4, 0.5);
        const north = new THREE.Mesh(wallGeo, mat);
        north.position.set(x,2,z - size/2);
        scene.add(north);

        const east = new THREE.Mesh(new THREE.BoxGeometry(0.5,4,size), mat);
        east.position.set(x + size/2, 2, z);
        scene.add(east);

        const west = east.clone();
        west.position.x = x - size/2;
        scene.add(west);
    },

    createTable(scene, x, z, mat) {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(4,4,0.3,16), mat);
        top.position.set(x,1,z);
        scene.add(top);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.8,1,8), new THREE.MeshStandardMaterial({color:0x111111}));
        leg.position.set(x,0.5,z);
        scene.add(leg);
    }
};
