import * as THREE from 'three';

export class WorldUI {
    constructor(scene, rig) {
        this.scene = scene;
        this.rig = rig;
        this.createDailyReward();
        this.createStore();
    }

    createDailyReward() {
        const board = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
        board.position.set(-2, 1.5, -5);
        this.scene.add(board);
        // Logic for clicking Daily Reward
    }

    createStore() {
        const storeSign = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        storeSign.position.set(2, 2, -5);
        this.scene.add(storeSign);
    }
}
