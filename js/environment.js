import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        const path = '../assets/textures/'; // Direct pathing from assets

        // 1. PERMANENT STADIUM LIGHTING (5 High-Altitude Points)
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        scene.add(hemi);

        const lightPositions = [[18, 18, 18], [-18, 18, 18], [18, 18, -18], [-18, 18, -18], [0, 18, -5]];
        lightPositions.forEach(pos => {
            const light = new THREE.PointLight(0xffffff, 500, 100);
            light.position.set(pos[0], pos[1], pos[2]);
            scene.add(light);
        });

        // 2. THE LOBBY CARPET (lobby_carpet.jpg)
        const carpetTex = loader.load(`${path}lobby_carpet.jpg`);
        carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
        carpetTex.repeat.set(2, 6);
        const carpet = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 30),
            new THREE.MeshStandardMaterial({ map: carpetTex })
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.02, 5);
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

        // 4. THE POKER STORE TABLE (table_felt_green.jpg)
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3.5, 3.5, 0.5, 32),
            new THREE.MeshStandardMaterial({ map: tableTex })
        );
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // 5. STORE OPTIONS LOBBY (Branding)
        const logoTex = loader.load(`${path}brand_logo.jpg`);
        const logo = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 32),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI/2;
        logo.position.set(0, 0.83, -5);
        scene.add(logo);

        // 6. WALLET UI (ui_winner_hologram.jpg)
        const holoTex = loader.load(`${path}ui_winner_hologram.jpg`);
        const holo = new THREE.Sprite(new THREE.SpriteMaterial({ map: holoTex, color: 0x00ffff }));
        holo.position.set(-2.5, 2.2, -4.5);
        holo.scale.set(1.5, 0.7, 1);
        scene.add(holo);
    }
};
