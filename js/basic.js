import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    playerGroup: new THREE.Group(),
    hands: [],
    
    init() {
        // 1. Scene & Rigging
        this.scene.background = new THREE.Color(0x111111);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // 2. Spawn Area (Safe & Spaced)
        this.playerGroup.position.set(0, 0, 2); // 2m back from center
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        // 3. Lighting
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(5, 10, 5);
        this.scene.add(sun);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

        // 4. Gray Plastic Hands (No controllers)
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
            this.hands.push(hand);
        }

        // 5. Structure (Room & Table)
        this.createRoom();
        
        this.renderer.setAnimationLoop(() => this.update());
    },

    createRoom() {
        // Main Poker Table
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        table.position.y = 0.8;
        this.scene.add(table);

        // Floor (Ensures you aren't in the void)
        const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(grid);
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    this.playerGroup.position.x += (axes[2] || 0) * 0.05;
                    this.playerGroup.position.z += (axes[3] || 0) * 0.05;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
