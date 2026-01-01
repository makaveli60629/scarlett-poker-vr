import * as THREE from 'three';

export function buildWorld(scene) {
    const floors = [];
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b2222, side: THREE.BackSide });

    function createRoom(x, z, size, lightCol, name) {
        const room = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(size, 4, size), wallMat);
        box.position.y = 2;
        
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x111111}));
        floor.rotation.x = -Math.PI/2;
        floor.name = name;
        floors.push(floor);

        // Decorative Pillars
        const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 4);
        const pillarMat = new THREE.MeshStandardMaterial({color: 0xffd700, metalness: 0.8});
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(p => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(p[0]*(size/2-0.2), 2, p[1]*(size/2-0.2));
            room.add(pillar);
        });

        const light = new THREE.PointLight(lightCol, 2, 20);
        light.position.set(0, 3.8, 0);
        
        room.add(box, floor, light);
        room.position.set(x, 0, z);
        scene.add(room);
    }

    createRoom(0, 0, 20, 0x00f2ff, "Lobby");
    createRoom(25, 0, 15, 0x00ff00, "Scorpion Room");
    createRoom(-25, 0, 15, 0xff00ff, "The Store");

    return { floors };
}
