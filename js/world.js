import * as THREE from 'three';

export const World = {
    build(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));

        // Floor Grid for Movement Reference
        const grid = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        scene.add(grid);

        // Neon Purple Pillars
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-6,-6], [6,-6], [-6,6], [6,6]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // The Table - Right in front of you
        this.addTable(scene, 0, -2.5);
    },

    addTable(scene, x, z) {
        const table = new THREE.Group();
        table.position.set(x, 0, z);

        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.2, 0.2),
            new THREE.MeshBasicMaterial({ color: 0x076324 })
        );
        felt.position.y = 0.8;

        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.05, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        trim.rotation.x = Math.PI/2;
        trim.position.y = 0.9;

        table.add(felt, trim);
        scene.add(table);
    }
};
