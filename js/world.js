import * as THREE from 'three';

export const World = {
    build(scene) {
        // Lighting Audit: Pure white ambient + directional for shadows
        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(5, 10, 5);
        scene.add(sun);

        // Floor: Large Grey Carpet
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshPhongMaterial({ color: 0x444444 })
        );
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Visual Grid: Helps you see if you are moving
        const grid = new THREE.GridHelper(40, 20, 0xffffff, 0x555555);
        grid.position.y = 0.01;
        scene.add(grid);

        // Walls: 4 Solid Walls (Height 6m)
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const wallGeoH = new THREE.BoxGeometry(40, 6, 0.5); // Horizontal
        const wallGeoV = new THREE.BoxGeometry(0.5, 6, 40); // Vertical

        const wallN = new THREE.Mesh(wallGeoH, wallMat); wallN.position.set(0, 3, -20);
        const wallS = new THREE.Mesh(wallGeoH, wallMat); wallS.position.set(0, 3, 20);
        const wallE = new THREE.Mesh(wallGeoV, wallMat); wallE.position.set(20, 3, 0);
        const wallW = new THREE.Mesh(wallGeoV, wallMat); wallW.position.set(-20, 3, 0);

        scene.add(wallN, wallS, wallE, wallW);

        // Neon Purple Pillars (Moved slightly so they don't block the spawn)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-10,-10], [10,-10], [-10,10], [10,10]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });
    }
};
