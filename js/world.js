import * as THREE from 'three';

export class PokerWorld {
    constructor(scene) {
        this.scene = scene;
        this.setupEnvironment();
        this.setupLights();
    }

    setupEnvironment() {
        // Floor to prevent "floating" feeling
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Poker Table Placeholder
        const tableGeo = new THREE.CylinderGeometry(1.5, 1.2, 0.1, 32);
        const tableMat = new THREE.MeshStandardMaterial({ 
            map: new THREE.TextureLoader().load('assets/textures/table_felt.jpg'),
            color: 0x006600 
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 0.8;
        this.scene.add(table);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const spotLight = new THREE.SpotLight(0xffffff, 10);
        spotLight.position.set(0, 5, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
    }
}
