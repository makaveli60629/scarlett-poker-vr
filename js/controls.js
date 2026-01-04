import * as THREE from 'three';
import { World } from './world.js';

export const Controls = {
    controllers: [],
    hands: [],
    raycaster: new THREE.Raycaster(),
    tempMatrix: new THREE.Matrix4(),

    init(renderer, scene, playerGroup, camera) {
        for(let i=0; i<2; i++){
            const controller = renderer.xr.getController(i);

            // Laser
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0,0,0),
                new THREE.Vector3(0,0,-1)
            ]);
            const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
            line.scale.z = 5;
            controller.add(line);
            controller.userData.line = line;

            playerGroup.add(controller);
            this.controllers.push(controller);

            // Simple hand sphere
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8),
                new THREE.MeshStandardMaterial({color:0x00ff00}));
            controller.add(hand);
            hand.controller = controller;
            hand.userData.isSelecting = false;
            this.hands.push(hand);

            controller.addEventListener('selectstart', () => { hand.userData.isSelecting = true; });
            controller.addEventListener('selectend', () => { hand.userData.isSelecting = false; });

            // Grab objects
            controller.addEventListener('squeezestart', ()=>{
                this.tempMatrix.identity().extractRotation(controller.matrixWorld);
                this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                this.raycaster.ray.direction.set(0,0,-1).applyMatrix4(this.tempMatrix);

                const intersects = this.raycaster.intersectObjects(World.grabbableObjects,true);
                if(intersects.length > 0){
                    const obj = intersects[0].object;
                    controller.userData.grabbed = obj;
                    obj.material.emissive = new THREE.Color(0x2222ff);
                }
            });

            controller.addEventListener('squeezeend', ()=>{
                if(controller.userData.grabbed){
                    controller.userData.grabbed.material.emissive = new THREE.Color(0x000000);
                    controller.userData.grabbed = null;
                }
            });
        }
    },

    update(renderer){
        // Update laser lines
        this.controllers.forEach(controller=>{
            const line = controller.userData.line;
            line.material.color.set(0x00ff00);
            this.tempMatrix.identity().extractRotation(controller.matrixWorld);
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0,0,-1).applyMatrix4(this.tempMatrix);

            const intersects = this.raycaster.intersectObjects(World.grabbableObjects,true);
            if(intersects.length>0){
                line.material.color.set(0xff0000);
            }

            // Move grabbed objects
            if(controller.userData.grabbed){
                controller.userData.grabbed.position.setFromMatrixPosition(controller.matrixWorld);
            }
        });
    }
};
