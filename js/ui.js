import * as THREE from 'three';

export class WorldUI {
    constructor(scene) {
        this.scene = scene;
        this.createKiosks();
    }

    createKiosks() {
        // Daily Reward Cube
        const reward = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xffd700 }));
        reward.position.set(-3, 1, -5);
        this.scene.add(reward);

        // Store Kiosk
        const store = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
        store.position.set(3, 0.75, -5);
        this.scene.add(store);
    }
}
