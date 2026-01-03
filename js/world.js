import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export const World = {
    build(scene) {
        // High Intensity Studio Lighting
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
        scene.add(hemi);
        const spot = new THREE.SpotLight(0xffffff, 5);
        spot.position.set(0, 10, 0);
        scene.add(spot);

        // TEXTURED FLOOR (Lobby)
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshPhongMaterial({ 
            color: 0x222222,
            map: loader.load('assets/textures/lobby_carpet.jpg') 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // NEON PURPLE PILLARS (Solid & Glowing)
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        [[-10,-10], [10,-10], [-10,10], [10,10]].forEach(loc => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10), neonMat);
            p.position.set(loc[0], 5, loc[1]);
            scene.add(p);
        });

        // SOLID WALLS with Concrete Texture
        this.addWalls(scene);
    },

    addWalls(scene) {
        const wallMat = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            map: loader.load('assets/textures/brickwall.jpg')
        });
        
        // North Wall
        const wallN = new THREE.Mesh(new THREE.BoxGeometry(50, 10, 1), wallMat);
        wallN.position.set(0, 5, -25);
        scene.add(wallN);

        // South Wall
        const wallS = new THREE.Mesh(new THREE.BoxGeometry(50, 10, 1), wallMat);
        wallS.position.set(0, 5, 25);
        scene.add(wallS);

        // East/West
        const wallSideGeo = new THREE.BoxGeometry(1, 10, 50);
        const wallE = new THREE.Mesh(wallSideGeo, wallMat);
        wallE.position.set(25, 5, 0);
        scene.add(wallE);
        
        const wallW = new THREE.Mesh(wallSideGeo, wallMat);
        wallW.position.set(-25, 5, 0);
        scene.add(wallW);
    }
};
