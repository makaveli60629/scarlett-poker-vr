import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export class World {
    constructor(scene, renderer, playerGroup) {
        this.scene = scene;
        this.renderer = renderer;
        this.playerGroup = playerGroup;
        this.handFactory = new XRHandModelFactory();
        
        this.setupLights();
        this.setupEnvironment();
        this.setupHands();
    }

    setupLights() {
        // Boosted lighting to ensure visibility
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        const pointLight = new THREE.PointLight(0xffffff, 2);
        pointLight.position.set(0, 3, 0); // Directly over the table
        this.scene.add(pointLight);
    }

    setupEnvironment() {
        // Floor Grid for spatial reference
        const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(grid);

        // Poker Table (Positioned at 0,0,0)
        // Since player is at 0,0,2, you are safely 2 meters away.
        const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x076324 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.8, 0); 
        this.scene.add(table);
    }

    setupHands() {
        // Left & Right Hands only (No Controllers)
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            const handModel = this.handFactory.createHandModel(hand, 'mesh');
            hand.add(handModel);
            this.playerGroup.add(hand);
        }
    }

    handleMovement() {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            if (source.gamepad) {
                const axes = source.gamepad.axes; 
                // Thumbstick movement (Axes 2 and 3)
                const x = axes[2] || 0;
                const z = axes[3] || 0;
                
                if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
                    this.playerGroup.position.x += x * 0.05;
                    this.playerGroup.position.z += z * 0.05;
                }
            }
        }
    }

    update() {
        this.handleMovement();
    }
}
