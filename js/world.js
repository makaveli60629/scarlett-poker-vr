import * as THREE from 'three';

export const World = {
    build(scene) {
        // High-Intensity Lighting Fix
        const light = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
        scene.add(light);

        // Lobby Floor
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // NEON PURPLE PILLARS (The only thing you saw before)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-10,-10], [10,-10], [-10,10], [10,10]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8), neonMat);
            p.position.set(loc[0], 4, loc[1]);
            scene.add(p);
        });

        // POKER TABLE (Placed at X=5 so it's right in front of you)
        this.addTable(scene, 5, 0);
    },

    addTable(scene, x, z) {
        const table = new THREE.Group();
        table.position.set(x, 0, z);

        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.4),
            new THREE.MeshPhongMaterial({ color: 0x076324, emissive: 0x002200 })
        );
        felt.position.y = 0.8;

        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.1),
            new THREE.MeshPhongMaterial({ color: 0x111111 })
        );
        trim.rotation.x = Math.PI/2;
        trim.position.y = 1.0;

        table.add(felt, trim);
        scene.add(table);
    }
};
