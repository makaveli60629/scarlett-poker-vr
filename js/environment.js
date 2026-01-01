import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        const path = './assets/textures/'; // Matches your screenshots

        // 1. Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 5);
        scene.add(sun);

        // 2. Room Walls (Using brickwall.jpg)
        const wallTex = loader.load(`${path}brickwall.jpg`);
        wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(4, 2);
        
        const room = new THREE.Mesh(
            new THREE.BoxGeometry(40, 20, 40),
            new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.BackSide })
        );
        scene.add(room);

        // 3. Poker Table (Using table_felt_green.jpg)
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.2, 32),
            new THREE.MeshStandardMaterial({ map: tableTex })
        );
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // 4. Logo on Table (Using brand_logo.jpg)
        const logoTex = loader.load(`${path}brand_logo.jpg`);
        const logo = new THREE.Mesh(
            new THREE.CircleGeometry(0.6, 32),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.set(0, 0.91, -5);
        scene.add(logo);

        // 5. Winner Hologram UI (Using ui_winner_hologram.jpg)
        const holoTex = loader.load(`${path}ui_winner_hologram.jpg`);
        const holoMat = new THREE.SpriteMaterial({ map: holoTex });
        const hologram = new THREE.Sprite(holoMat);
        hologram.position.set(0, 2.5, -5.5);
        hologram.scale.set(3, 1.5, 1);
        scene.add(hologram);
    }
};
