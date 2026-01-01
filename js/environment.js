import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        // Path jumps out of 'js' folder into 'assets/textures'
        const path = '../assets/textures/'; 

        // 1. GLOBAL LIGHTING
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 2.0);
        pointLight.position.set(0, 5, 0);
        scene.add(pointLight);

        // 2. THE MAIN ROOM (brickwall.jpg)
        const wallTex = loader.load(`${path}brickwall.jpg`);
        wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(4, 2);

        const roomMat = new THREE.MeshStandardMaterial({ 
            map: wallTex, 
            color: 0x884444, // Fallback red-brick color
            side: THREE.BackSide 
        });
        const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), roomMat);
        room.position.y = 10;
        scene.add(room);

        // 3. THE POKER TABLE (table_felt_green.jpg)
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const tableMat = new THREE.MeshStandardMaterial({ 
            map: tableTex, 
            color: 0x004400 // Fallback green
        });
        const table = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.4, 32), tableMat);
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // 4. THE BRAND LOGO (brand_logo.jpg)
        const logoTex = loader.load(`${path}brand_logo.jpg`);
        const logo = new THREE.Mesh(
            new THREE.CircleGeometry(0.7, 32),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
        );
        logo.rotation.x = -Math.PI / 2;
        logo.position.set(0, 0.821, -5); // Just above table surface
        scene.add(logo);
    }
};
