import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.textureLoader = new THREE.TextureLoader();
        this.texPath = 'assets/textures/';
        
        this.createEnvironment();
    }

    createEnvironment() {
        // The Poker Table
        const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 40);
        const tableMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a472a, // Classic felt green
            roughness: 0.9 
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 1.0; // Standard table height in meters
        this.scene.add(table);

        // Floor (Grid for spatial awareness)
        const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
        this.scene.add(grid);
    }

    // Update 1.3 Winning Logic
    displayWinner(playerID, message) {
        // 1. Highlight Winning Player (Logic placeholder)
        console.log(`Player ${playerID} Wins!`);

        // 2. Spawn Floating Win Text
        const winBanner = this.createWinMesh(message);
        this.scene.add(winBanner);

        // 3. Permanent instruction: Delete after 10 seconds
        setTimeout(() => {
            this.scene.remove(winBanner);
        }, 10000);
    }

    createWinMesh(text) {
        // Create a simple plane banner for the text
        const geo = new THREE.PlaneGeometry(0.8, 0.3);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xffd700, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const banner = new THREE.Mesh(geo, mat);
        banner.position.set(0, 1.8, -0.5); // Floating above table
        return banner;
    }

    update(time) {
        // Placeholder for future noise/shader updates (Update 1.4)
    }
}
