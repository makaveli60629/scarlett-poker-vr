import * as THREE from 'three';
import { World } from './world.js';

export const Controls = {
    controllers: [],
    raycaster: new THREE.Raycaster(),
    tempVec: new THREE.Vector3(),

    init(renderer, scene, playerGroup) {
        for(let i=0;i<2;i++){
            const controller = renderer.xr.getController(i);

            // Laser
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)]);
            const line = new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x00ff00}));
            controller.add(line);

            playerGroup.add(controller);
            this.controllers.push(controller);

            // Teleport
            controller.addEventListener('selectstart',()=>{
                const dir = new THREE.Vector3(0,0,-1).applyQuaternion(controller.quaternion);
                const origin = controller.getWorldPosition(new THREE.Vector3());
                this.raycaster.set(origin, dir);
                const intersects = this.raycaster.intersectObjects(World.collisionObjects,true);
                if(intersects.length>0){
                    const p = intersects[0].point;
                    playerGroup.position.set(p.x,1.6,p.z);
                }
            });
        }
    },

    update(playerGroup){
        // Optional: hover highlight on grabbables
        this.controllers.forEach(controller=>{
            const origin = controller.getWorldPosition(new THREE.Vector3());
            const dir = new THREE.Vector3(0,0,-1).applyQuaternion(controller.quaternion);
            this.raycaster.set(origin, dir);
            const intersects = this.raycaster.intersectObjects(World.grabbableObjects,true);
            controller.children[0].material.color.set(intersects.length>0?0xff0000:0x00ff00);
        });
    }
};
