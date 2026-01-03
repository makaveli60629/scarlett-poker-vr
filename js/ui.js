import * as THREE from 'three';

export const UI = {
    scene: null,
    playerGroup: null,
    watch: null,
    menu: null,

    init(scene, playerGroup){
        this.scene = scene;
        this.playerGroup = playerGroup;

        // Watch (small panel attached to right wrist/controller)
        this.watch = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.02), new THREE.MeshStandardMaterial({color:0x222222}));
        this.watch.position.set(0.2, -0.2, -0.1);
        this.playerGroup.add(this.watch);

        // Menu Panel (toggleable)
        this.menu = new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.6), new THREE.MeshStandardMaterial({color:0x111111, side:THREE.DoubleSide}));
        this.menu.position.set(0,1,-0.5);
        this.menu.visible = false;
        this.playerGroup.add(this.menu);
    },

    toggleMenu(){
        this.menu.visible = !this.menu.visible;
    },

    update(){
        // Optional: rotate watch panel to follow camera
        if(this.watch){
            this.watch.lookAt(this.playerGroup.children[0].position);
        }
    }
};
