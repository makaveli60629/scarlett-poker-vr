import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance",
        xrCompatible: true // Critical fix for Oculus black screen
    }),
    playerGroup: new THREE.Group(),

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.setClearColor(0x111111); // Force a visible grey if nothing loads
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // INITIAL SPAWN: Center of the room, Eye Level
        this.playerGroup.position.set(0, 1.6, 0); 
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        // RESET ON ENTER: This forces you to be level when you put the headset on
        this.renderer.xr.addEventListener('sessionstart', () => {
            console.log("VR Session Started - Leveling Player");
            this.playerGroup.position.set(0, 1.6, 0);
            this.camera.position.set(0, 0, 0); // Reset internal camera offset
        });

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
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
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    if (source.handedness === 'left') {
                        // Smooth move: x and z only to keep you leveled
                        this.playerGroup.position.x += (axes[2] || 0) * 0.1;
                        this.playerGroup.position.z += (axes[3] || 0) * 0.1;
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
