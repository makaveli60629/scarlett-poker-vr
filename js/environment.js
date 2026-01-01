import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        const path = '../assets/textures/'; // Jumps out of JS folder

        // STAGE 1: LIGHTING (Fixes the "Dark" issue)
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(5, 15, 5);
        scene.add(sun);

        // STAGE 2: WALLS (brickwall.jpg)
        const wallTex = loader.load(`${path}brickwall.jpg`);
        wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(6, 3);
        const room = new THREE.Mesh(
            new THREE.BoxGeometry(50, 25, 50),
            new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.BackSide })
        );
        scene.add(room);

        // STAGE 3: TABLE (table_felt_green.jpg)
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3.5, 3.5, 0.2, 32),
            new THREE.MeshStandardMaterial({ map: tableTex })
        );
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // STAGE 4: LOGO (brand_logo.jpg)
        const logoTex = loader.load(`${path}brand_logo.jpg`);
        const logo = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 32),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.set(0, 0.91, -5);
        scene.add(logo);
    }
};
