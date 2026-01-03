import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export class World {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.setupLights();
        this.setupEnvironment();
        this.setupHands();
    }

    setupLights() {
        // High intensity ambient light so everything is visible
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);
    }

    setupEnvironment() {
        // A simple white cube at the center to test visibility
        const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(0, 1.2, -1); // Right in front of your face
        this.scene.add(box);

        // Grid floor
        const grid = new THREE.GridHelper(10, 10, 0xffffff, 0x444444);
        this.scene.add(grid);
    }

    setupHands() {
        this.handFactory = new XRHandModelFactory();
        
        // Left Hand
        const hand1 = this.renderer.xr.getHand(0);
        hand1.add(this.handFactory.createHandModel(hand1, 'mesh'));
        this.scene.add(hand1);

        // Right Hand
        const hand2 = this.renderer.xr.getHand(1);
        hand2.add(this.handFactory.createHandModel(hand2, 'mesh'));
        this.scene.add(hand2);
    }

    update() {}
}
