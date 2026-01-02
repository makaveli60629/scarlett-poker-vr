import * as THREE from 'three';

export class PokerEngine {
    constructor(scene, texLoader) {
        this.scene = scene;
        this.texLoader = texLoader;
        this.isSeated = false;
        this.createTable();
    }

    createTable() {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x006400 }));
        table.position.set(0, 0.8, -3);
        this.scene.add(table);
    }

    checkPlayerDistance(playerPos) {
        const dist = playerPos.distanceTo(new THREE.Vector3(0, 1.6, -3));
        if (!this.isSeated && dist < 1.4) {
            this.isSeated = true;
            this.triggerWin("WINNER: PLAYER 1");
        }
    }

    triggerWin(text) {
        console.log(text);
        // Create 3D floating letters here for 10 seconds
    }
}
