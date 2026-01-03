import * as THREE from 'three';

export const World = {
    colliders: [],

    build(scene) {
        // AMBIENT LIGHTING: Boosted to 2.0 to force colors to pop
        scene.add(new THREE.AmbientLight(0xffffff, 2.0));
        
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(0, 10, 0);
        scene.add(sun);

        // THE FLOOR: Solid Blue (Lobby) so you can't miss it
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x112244 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // THE GRID: Bright Red (Matches what you saw)
        const grid = new THREE.GridHelper(50, 25, 0xff0000, 0x000000);
        grid.position.y = 0.05;
        scene.add(grid);

        // THE NEON PILLARS: High-Intensity Purple
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-10,-10], [10,-10], [-10,10], [10,10]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12), neonMat);
            p.position.set(loc[0], 6, loc[1]);
            scene.add(p);
        });

        // POKER TABLE: Vivid Green
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        );
        table.position.set(0, 1, -5); // Right in front of your new spawn
        scene.add(table);
    }
};
