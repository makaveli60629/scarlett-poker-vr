import * as THREE from 'three';

export const Controls = {
    playerGroup: null,
    scene: null,
    renderer: null,
    speed: 0.1,

    init(renderer, scene, playerGroup) {
        this.renderer = renderer;
        this.scene = scene;
        this.playerGroup = playerGroup;

        // Add ray/laser for teleport and UI interaction
        this.raycaster = new THREE.Raycaster();
        this.tempVec = new THREE.Vector3();
    },

    update() {
        // Simple keyboard movement (for testing without VR)
        const keys = { w: false, a: false, s: false, d: false };
        document.addEventListener('keydown', (e) => keys[e.key] = true);
        document.addEventListener('keyup', (e) => keys[e.key] = false);

        if (!this.playerGroup) return;

        if (keys.w) this.playerGroup.position.z -= this.speed;
        if (keys.s) this.playerGroup.position.z += this.speed;
        if (keys.a) this.playerGroup.position.x -= this.speed;
        if (keys.d) this.playerGroup.position.x += this.speed;
    }
};
