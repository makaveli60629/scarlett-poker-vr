import * as THREE from 'three';

export const Controls = {
    controllers: [],
    lasers: [],
    raycaster: new THREE.Raycaster(),
    blockedObjects: [],

    init(renderer, scene, playerGroup) {
        // Collect objects you don't want teleporting through (walls, tables, safe)
        scene.traverse((obj) => {
            if (obj.isMesh && (obj.geometry.type === "BoxGeometry" || obj.geometry.type === "CylinderGeometry")) {
                this.blockedObjects.push(obj);
            }
        });

        for (let i = 0; i < 2; i++) {
            const controller = renderer.xr.getController(i);
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
            const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const line = new THREE.Line(geometry, material);
            controller.add(line);
            
            playerGroup.add(controller);
            this.controllers.push(controller);
            this.lasers.push(line);

            controller.addEventListener('selectstart', () => {
                const teleportPos = new THREE.Vector3();
                const direction = new THREE.Vector3(0,0,-1).applyQuaternion(controller.quaternion);

                // Only move if laser is green
                if (line.material.color.getHex() === 0x00ff00) {
                    playerGroup.position.x += direction.x * 5;
                    playerGroup.position.z += direction.z * 5;
                }
            });
        }
    },

    update(renderer, playerGroup) {
        this.controllers.forEach((controller, idx) => {
            const line = this.lasers[idx];

            // Raycast from controller forward
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
            const rayOrigin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);

            this.raycaster.set(rayOrigin, rayDirection);
            const intersects = this.raycaster.intersectObjects(this.blockedObjects, false);

            if (intersects.length > 0 && intersects[0].distance < 5) {
                line.material.color.set(0xff0000); // Red if blocked
            } else {
                line.material.color.set(0x00ff00); // Green if free
            }
        });
    }
};
