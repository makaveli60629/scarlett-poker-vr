import * as THREE from 'three';

export const Controls = {
    controllers: [],
    hands: [],

    init(renderer, scene, playerGroup, camera){
        for(let i=0;i<2;i++){
            const controller = renderer.xr.getController(i);
            
            // Laser
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0,0,0),
                new THREE.Vector3(0,0,-5)
            ]);
            const line = new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x00ff00}));
            controller.add(line);

            playerGroup.add(controller);
            this.controllers.push(controller);

            controller.addEventListener('selectstart',()=>{
                const dir = new THREE.Vector3(0,0,-1).applyQuaternion(controller.quaternion);
                playerGroup.position.x += dir.x*5;
                playerGroup.position.z += dir.z*5;
            });

            // Add simple hand model
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8),
                new THREE.MeshStandardMaterial({color:0xffff00}));
            controller.add(hand);
            hand.controller = controller;
            hand.userData.isSelecting = false;
            this.hands.push(hand);

            controller.addEventListener('selectstart',()=>{hand.userData.isSelecting=true;});
            controller.addEventListener('selectend',()=>{hand.userData.isSelecting=false;});
        }
    },

    update(renderer){
        // Could add hand animations here
    }
};
