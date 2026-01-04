import * as THREE from 'three';

export const UI = {
    watch: null,

    init(scene, playerGroup){
        this.watch = new THREE.Mesh(
            new THREE.BoxGeometry(0.12,0.12,0.02),
            new THREE.MeshStandardMaterial({color:0x222222})
        );
        this.watch.position.set(-0.2,1.4,-0.3); // Left wrist
        playerGroup.add(this.watch);

        // Sample buttons on watch
        const btn = new THREE.Mesh(
            new THREE.BoxGeometry(0.05,0.03,0.01),
            new THREE.MeshStandardMaterial({color:0x00ffff})
        );
        btn.position.set(0,0,0.03);
        btn.userData.action = 'Test';
        this.watch.add(btn);
    },

    update(){
        // Could animate hover/interaction effects
    }
};
