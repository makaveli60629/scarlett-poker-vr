import * as THREE from 'three';

export class PokerWorld {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.buildWorld();
    }

    buildWorld() {
        // 1. LIGHTING - CRITICAL FIX
        // Ambient light to ensure nothing is pitch black
        const ambient = new THREE.AmbientLight(0xffffff, 1.0); 
        this.scene.add(ambient);

        // Hemisphere light (Sky color / Ground color)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        this.scene.add(hemiLight);

        // Strong Sun light
        const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.position.set(5, 10, 5);
        this.scene.add(sunLight);

        // 2. THE FLOOR (Lobby)
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x444444, 
            roughness: 0.8 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // 3. THE POKER TABLE
        const tableGroup = new THREE.Group();
        
        // Table Felt
        const feltGeo = new THREE.CylinderGeometry(1.6, 1.5, 0.2, 32);
        const feltMat = new THREE.MeshStandardMaterial({ color: 0x006600 });
        const felt = new THREE.Mesh(feltGeo, feltMat);
        felt.position.y = 0.9;
        tableGroup.add(felt);

        // Leather Trim
        const trimGeo = new THREE.TorusGeometry(1.6, 0.1, 16, 100);
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 1.0;
        tableGroup.add(trim);

        this.scene.add(tableGroup);

        // 4. ROOM WALLS (Visual Reference)
        const grid = new THREE.GridHelper(50, 50, 0xff0000, 0x222222);
        this.scene.add(grid);
    }
}
