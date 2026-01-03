import * as THREE from 'three';
const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        // 1. FORCE THE BACKGROUND TO GREY (So you aren't in a black void)
        scene.background = new THREE.Color(0x444444);

        // 2. THE FLOOR (Self-Lit)
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshBasicMaterial({ 
            color: 0x222222, 
            side: THREE.DoubleSide 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // 3. THE GRID (Visual reference for movement)
        const grid = new THREE.GridHelper(100, 50, 0xffffff, 0x888888);
        scene.add(grid);

        // 4. NEON PURPLE PILLARS (The pillars you mentioned seeing before)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-8,-8], [8,-8], [-8,8], [8,8]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // 5. THE POKER TABLE (Forced Visibility)
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x076324 })
        );
        table.position.set(0, 0.8, -5); // 5 meters in front of you
        scene.add(table);
    }
};
