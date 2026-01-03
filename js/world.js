import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const loader = new THREE.TextureLoader();

export const World = {
    colliders: [],

    build(scene) {
        this.addExtremeLighting(scene);
        
        // Rooms
        this.createMegaRoom(scene, "Lobby", 0, 0, 0x111111, 'lobby_carpet.jpg');
        this.createMegaRoom(scene, "Poker", 60, 0, 0x050505, 'table_felt.jpg');
        this.createMegaRoom(scene, "Store", -60, 0, 0x050505, 'lobby_carpet.jpg');
        this.createMegaRoom(scene, "Vault", 0, 60, 0x050505, 'brickwall.jpg');

        this.addCasinoFurniture(scene);
        this.addStoreMirror(scene);
        this.addDecorations(scene);
    },

    addExtremeLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 3.0));
        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(10, 25, 10);
        scene.add(sun);
    },

    addStoreMirror(scene) {
        // The Mirror in the Storeroom
        const mirror = new Reflector(new THREE.PlaneGeometry(2, 3), {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x889999
        });
        mirror.position.set(-60, 1.5, -19.5); // Back wall of Store
        scene.add(mirror);
    },

    addCasinoFurniture(scene) {
        const leatherTex = loader.load('assets/textures/leather_trim.jpg');
        
        // High-Back Dealer Chairs at the Poker Table
        const chairGroup = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), new THREE.MeshStandardMaterial({map: leatherTex}));
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), new THREE.MeshStandardMaterial({map: leatherTex}));
        back.position.set(0, 0.4, -0.3);
        chairGroup.add(seat, back);
        
        // Place 6 chairs around the poker table at (60, 0, 0)
        for(let i=0; i<6; i++) {
            const c = chairGroup.clone();
            const angle = (i / 6) * Math.PI * 2;
            c.position.set(60 + Math.cos(angle)*2.5, 0.4, Math.sin(angle)*2.5);
            c.lookAt(60, 0.4, 0);
            scene.add(c);
        }
    },

    addDecorations(scene) {
        // Gold Pillars for that Casino look
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 32);
        const goldMat = new THREE.MeshStandardMaterial({color: 0xffd700, metalness: 0.9, roughness: 0.1});
        
        const positions = [[-18, -18], [18, -18], [-18, 18], [18, 18]];
        positions.forEach(p => {
            const pillar = new THREE.Mesh(pillarGeo, goldMat);
            pillar.position.set(p[0], 3, p[1]);
            scene.add(pillar);
            this.colliders.push(new THREE.Box3().setFromObject(pillar));
        });
    },

    createMegaRoom(scene, name, x, z, floorCol, texFile) {
        const size = 40;
        const height = 6;
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: floorCol, map: loader.load(`assets/textures/${texFile}`)}));
        floor.rotation.x = -Math.PI/2;
        group.add(floor);

        const wallConfigs = [{p:[0,3,-20], s:[size,6,0.5]}, {p:[0,3,20], s:[size,6,0.5]}, {p:[-20,3,0], s:[0.5,6,size]}, {p:[20,3,0], s:[0.5,6,size]}];
        wallConfigs.forEach(w => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...w.s), new THREE.MeshStandardMaterial({map: loader.load('assets/textures/brickwall.jpg')}));
            wall.position.set(...w.p);
            group.add(wall);
            this.colliders.push(new THREE.Box3().setFromObject(wall));
        });
        scene.add(group);
    }
};
