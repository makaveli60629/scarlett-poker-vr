import * as THREE from 'three';

export const World = {
    build(scene) {
        // OVERKILL LIGHTING: Point lights at head height to stop the black-out
        const amb = new THREE.AmbientLight(0xffffff, 2.0);
        scene.add(amb);
        
        const topLight = new THREE.PointLight(0xffffff, 10);
        topLight.position.set(0, 5, 0);
        scene.add(topLight);

        // Lobby (Center)
        this.createFloor(scene, 0, 0, 0x222222);
        
        // NEON PURPLE PILLARS
        const neonPurple = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 10), neonPurple);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // POKER TABLE (Right side, very bright)
        this.addTable(scene, 8, 0);
    },

    addTable(scene, x, z) {
        const table = new THREE.Group();
        table.position.set(x, 0, z);

        const felt = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.4, 32),
            new THREE.MeshPhongMaterial({ color: 0x076324, emissive: 0x001100 })
        );
        felt.position.y = 0.8;

        const leatherTrim = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.15, 16, 100),
            new THREE.MeshPhongMaterial({ color: 0x111111 })
        );
        leatherTrim.rotation.x = Math.PI/2;
        leatherTrim.position.y = 1.0;

        table.add(felt, leatherTrim);
        scene.add(table);
        
        // Add one white light specifically for the table
        const tableLight = new THREE.PointLight(0xffffff, 5);
        tableLight.position.set(x, 3, z);
        scene.add(tableLight);
    },

    createFloor(scene, x, z, col) {
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            new THREE.MeshPhongMaterial({ color: col })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);
    }
};
