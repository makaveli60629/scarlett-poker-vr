import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { Dealer } from './dealer.js'; // Pointing to our new Organ

export const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    playerGroup: new THREE.Group(),
    
    init() {
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Rigging & Safe Spawn
        this.playerGroup.position.set(0, 0, 2); 
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupLights();
        this.setupRoom();
        this.setupHands();

        // DEAL THE CARDS ON START
        Dealer.dealFlop(this.scene);

        this.renderer.setAnimationLoop(() => this.update());
    },

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const spot = new THREE.SpotLight(0xffffff, 2);
        spot.position.set(0, 5, 0);
        this.scene.add(spot);
    },

    setupRoom() {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x076324 })
        );
        table.position.y = 0.8;
        this.scene.add(table);

        const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(grid);
    },

    setupHands() {
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    },

    update() {
        // Left Stick Movement
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    this.playerGroup.position.x += axes[2] * 0.05;
                    this.playerGroup.position.z += axes[3] * 0.05;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
