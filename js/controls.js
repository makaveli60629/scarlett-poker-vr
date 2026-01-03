import * as THREE from 'three';

export const Controls = {
    controllers: [],
    laser: null,

    init(renderer, scene, playerGroup) {
        // Setup 2 Controllers
        for (let i = 0; i < 2; i++) {
            const controller = renderer.xr.getController(i);
            
            // Add a visual line to the controller (The Laser Pointer)
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]);
            const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
            controller.add(line);
            
            // Add controller to the PLAYER GROUP (so it follows you)
            playerGroup.add(controller);
            this.controllers.push(controller);

            // Teleport on Trigger
            controller.addEventListener('selectstart', () => {
                const teleportPos = new THREE.Vector3();
                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion);
                
                // Move player group 5 meters in the direction pointed
                playerGroup.position.x += direction.x * 5;
                playerGroup.position.z += direction.z * 5;
            });
        }
    },

    update(renderer, playerGroup) {
        // Optional: Hand animation logic would go here
    }
};
