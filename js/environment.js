import * as THREE from 'three';

export const World = {
    build(scene) {
        // 1. ADD MASSIVE LIGHTING JUST IN CASE
        const ambient = new THREE.AmbientLight(0xffffff, 2.0);
        scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(0, 10, 0);
        scene.add(sun);

        // 2. THE FLOOR (Grey Circle)
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(20, 32),
            new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // 3. THE TABLE (Force Green)
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.4, 32),
            new THREE.MeshBasicMaterial({ color: 0x076324 }) // Poker Green
        );
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // 4. THE WALLS (Force Brick Red)
        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(40, 20, 40),
            new THREE.MeshBasicMaterial({ color: 0x552222, side: THREE.BackSide })
        );
        walls.position.y = 10;
        scene.add(walls);
    }
};
