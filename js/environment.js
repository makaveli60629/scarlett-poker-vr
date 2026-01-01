import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        const path = '../assets/textures/'; 

        // 1. POWERFUL LIGHTING (Fixes the Darkness)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.0);
        scene.add(hemiLight);

        const spotLight = new THREE.SpotLight(0xffffff, 3);
        spotLight.position.set(0, 10, -5);
        scene.add(spotLight);

        // 2. FLOOR (The Gray Circle you saw)
        const floorGeo = new THREE.CircleGeometry(10, 32);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        scene.add(floor);

        // 3. BRICK WALLS (Using your brickwall.jpg)
        const wallTex = loader.load(`${path}brickwall.jpg`, 
            undefined, // onLoad
            undefined, // onProgress
            () => { console.error("Wall texture failed to load"); } // onError
        );
        wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(4, 2);

        const room = new THREE.Mesh(
            new THREE.BoxGeometry(40, 20, 40),
            new THREE.MeshStandardMaterial({ 
                map: wallTex, 
                color: 0x552222, // Fallback color if texture fails
                side: THREE.BackSide 
            })
        );
        room.position.y = 10;
        scene.add(room);

        // 4. POKER TABLE (Using your table_felt_green.jpg)
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.5, 32),
            new THREE.MeshStandardMaterial({ map: tableTex, color: 0x004400 })
        );
        table.position.set(0, 0.8, -5);
        scene.add(table);
    }
};
