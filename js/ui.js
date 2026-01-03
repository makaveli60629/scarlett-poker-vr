import * as THREE from 'three';

export const UI = {
    watch: null,
    init(scene, playerGroup){
        this.watch = new THREE.Mesh(
            new THREE.BoxGeometry(0.1,0.1,0.02),
            new THREE.MeshStandardMaterial({color:0x222222})
        );
        this.watch.position.set(-0.2,1.4,-0.3); // Left wrist
        playerGroup.add(this.watch);
    },
    update(){
        // Could add toggleable menu logic here
    }
};
