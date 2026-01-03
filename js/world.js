import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export class World {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.handFactory = new XRHandModelFactory();

        this.setupLights();
        this.setupEnvironment();
        this.setupHands();
    }

    setupLights() {
        // Boosted lighting to prevent black objects
        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(5, 10, 7);
        this.scene.add(sun);
    }

    setupEnvironment() {
        // Green Poker Table
        const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x006600 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.7, -1); // Placed in front of user
        this.scene.add(table);

        // Floor (Grid)
        const grid = new THREE.GridHelper(10, 10);
        this.scene.add(grid);
    }

    setupHands() {
        // Controller 0 (Left Hand)
        this.hand1 = this.renderer.xr.getHand(0);
        this.hand1.add(this.handFactory.createHandModel(this.hand1, 'mesh'));
        this.scene.add(this.hand1);

        // Controller 1 (Right Hand)
        this.hand2 = this.renderer.xr.getHand(1);
        this.hand2.add(this.handFactory.createHandModel(this.hand2, 'mesh'));
        this.scene.add(this.hand2);
        
        console.log("Hands initialized - controllers hidden as per update instructions.");
    }

    update() {
        // Logic for hand movement or physics goes here
    }
}
