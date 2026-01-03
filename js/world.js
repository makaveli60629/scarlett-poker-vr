import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const loader = new THREE.TextureLoader();

export const World = {
    colliders: [],
    interactiveObjects: [],

    build(scene) {
        this.addExtremeLighting(scene);
        
        // The 4 Mega Rooms (40m x 40m)
        this.createRoom(scene, "Lobby", 0, 0, 0x111111, 'lobby_carpet.jpg');
        this.createRoom(scene, "Poker", 60, 0, 0x050505, 'table_felt.jpg');
        this.createRoom(scene, "Store", -60, 0, 0x050505, 'lobby_carpet.jpg');
        this.createRoom(scene, "Vault", 0, 60, 0x050505, 'brickwall.jpg');

        this.addLuxuryAssets(scene);
        this.addMirror(scene);
    },

    addExtremeLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 3.2));
        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(10, 25, 10);
        scene.add(sun);
    },

    addMirror(scene) {
        const mirror = new Reflector(new THREE.PlaneGeometry(3, 4.5), {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x777777
        });
        mirror.position.set(-60, 2.2, -19.8); // Back wall of Store
        scene.add(mirror);
    },

    addLuxuryAssets(scene) {
        const leatherMat = new THREE.MeshStandardMaterial({
            map: loader.load('assets/textures/leather_trim.jpg'),
            color: 0x222222
        });
        const goldMat = new THREE.MeshStandardMaterial({color: 0xffd700, metalness: 0.9, roughness: 0.1});

        // Main Poker Table with Leather Trim Ring
        const tableGroup = new THREE.Group();
        tableGroup.position.set(60, 0, 0);
        
        const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32), new THREE.MeshStandardMaterial({color: 0x076324, map: loader.load('assets/textures/table_felt.jpg')}));
        felt.position.y = 0.9;
        
        const trim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.15, 16, 100), leatherMat);
        trim.rotation.x = Math.PI/2;
        trim.position.y = 1.0;
        tableGroup.add(felt, trim);

        // Dealer Chairs
        for(let i=0; i<6; i++) {
            const chair = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), leatherMat);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.1), leatherMat);
            back.position.set(0, 0.5, -0.35);
            chair.add(seat, back);
            const angle = (i / 6) * Math.PI * 2;
            chair.position.set(Math.cos(angle)*3.5, 0.4, Math.sin(angle)*3.5);
            chair.lookAt(0, 0.4, 0);
            tableGroup.add(chair);
            this.colliders.push(new THREE.Box3().setFromObject(chair));
        }
        scene.add(tableGroup);

        // Gold Pillars in Lobby corners
        const pLocs = [[-19, -19], [19, -19], [-19, 19], [19, 19]];
        pLocs.forEach(loc => {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 32), goldMat);
            pillar.position.set(loc[0], 3, loc[1]);
            scene.add(pillar);
            this.colliders.push(new THREE.Box3().setFromObject(pillar));
        });
    },

    createRoom(scene, name, x, z, floorCol, tex) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({color: floorCol, map: loader.load(`assets/textures/${tex}`)}));
        floor.rotation.x = -Math.PI/2;
        group.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({map: loader.load('assets/textures/brickwall.jpg')});
        const walls = [
            {p:[0,3,-20], s:[40,6,0.5]}, {p:[0,3,20], s:[40,6,0.5]},
            {p:[-20,3,0], s:[0.5,6,40]}, {p:[20,3,0], s:[0.5,6,40]}
        ];
        walls.forEach(w => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...w.s), wallMat);
            wall.position.set(...w.p);
            group.add(wall);
            this.colliders.push(new THREE.Box3().setFromObject(wall));
            
            // Purple Neon Trim
            const neon = new THREE.Mesh(new THREE.BoxGeometry(w.s[0]>w.s[2]?40:0.6, 0.2, 0.2), new THREE.MeshBasicMaterial({color: 0xa020f0}));
            neon.position.set(0, 2.9, 0.3);
            wall.add(neon);
        });
        scene.add(group);
    }
};
