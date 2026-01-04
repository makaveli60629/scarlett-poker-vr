import * as THREE from 'three';

export const Interactions = {
    scene: null,
    playerGroup: null,

    init(scene, playerGroup) {
        this.scene = scene;
        this.playerGroup = playerGroup;
    },

    update() {
        // Placeholder for hand interactions
    }
};
