import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        const path = '../assets/textures/'; // Correctly jumps out of js/ folder

        // 1. LIGHTING
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(0, 10, 5);
        scene.add(sun);

        // 2. THE LOBBY CARPET (lobby_carpet.jpg)
        const carpetTex = loader.load(`${path}lobby_carpet.jpg`);
        carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
        carpetTex.repeat.set(1, 4);
        const carpet = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 20),
            new THREE.MeshStandardMaterial({ map: carpetTex })
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.01, 5);
        scene.add(carpet);

        // 3. BRICK WALLS (brickwall.jpg)
        const wallTex = loader.load(`${path}brickwall.jpg`);
        wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(4, 2);
        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(40, 20, 40),
            new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.BackSide })
        );
        walls.position.y = 10;
        scene.add(walls);

        // 4. THE POKER TABLE (table_felt_green.jpg)
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.4, 32),
            new THREE.MeshStandardMaterial({ map: tableTex })
        );
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // 5. BRAND LOGO (brand_logo.jpg)
        const logoTex = loader.load(`${path}brand_logo.jpg`);
        const logo = new THREE.Mesh(
            new THREE.CircleGeometry(0.7, 32),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.set(0, 0.821, -5);
        scene.add(logo);
        
        // 6. WALLET HOLOGRAM UI
        const holoTex = loader.load(`${path}ui_winner_hologram.jpg`);
        const spriteMat = new THREE.SpriteMaterial({ map: holoTex, color: 0x00ffff });
        const balanceTag = new THREE.Sprite(spriteMat);
        balanceTag.position.set(-2.5, 2.5, -4.5);
        balanceTag.scale.set(1.5, 0.7, 1);
        scene.add(balanceTag);
    }
};
