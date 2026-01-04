import * as THREE from 'three';

export const UI = {
    scene: null,

    init(scene) {
        this.scene = scene;

        // Example hologram
        const geo = new THREE.PlaneGeometry(2, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 });
        const hologram = new THREE.Mesh(geo, mat);
        hologram.position.set(0, 2, -2);
        scene.add(hologram);
    },

    update() {
        // Could rotate or animate holograms
    }
};
