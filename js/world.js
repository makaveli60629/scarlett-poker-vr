import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export class World {
    constructor(scene, renderer, playerGroup) {
        this.scene = scene;
        this.renderer = renderer;
        this.playerGroup = playerGroup;
        this.moveSpeed = 0.05;

        this.setupLights();
        this.setupEnvironment();
        this.setupHands();
    }

    setupLights() {
        // Ambient light for general visibility
        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);

        // Directional light for depth and shadows
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(5, 10, 5);
        this.scene.add(sun);
    }

    setupEnvironment() {
        // Floor Grid
        const grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
        this.scene.add(grid);

        // Poker Table (Center of the room)
        const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x076324 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.8, 0); 
        this.scene.add(table);
    }

    setupHands() {
        this.handFactory = new XRHandModelFactory();

        // Initialize Hands and add them to the playerGroup (so they move with you)
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(this.handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    }

    handleMovement() {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        // Check each input source (Left/Right controllers)
        for (const source of session.inputSources) {
            if (source.gamepad) {
                const axes = source.gamepad.axes;
                // axes[2] is horizontal, axes[3] is vertical on most thumbsticks
                const x = axes[2] || 0;
                const z = axes[3] || 0;

                if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
                    this.playerGroup.position.x += x * this.moveSpeed;
                    this.playerGroup.position.z += z * this.moveSpeed;
                }
            }
        }
    }

    update() {
        this.handleMovement();
    }
}
