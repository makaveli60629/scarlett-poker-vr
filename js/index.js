import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    // FORCE high-performance power preference for Oculus Browser
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance" 
    }),
    playerGroup: new THREE.Group(),

    async init() {
        // Fix: Force XR Compatibility before doing anything else
        const gl = this.renderer.getContext();
        if (gl.makeXRCompatible) {
            await gl.makeXRCompatible();
        }

        // Fix: Set a visible background color immediately (Dark Blue/Grey)
        this.scene.background = new THREE.Color(0x020205);
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // SPAWN SAFETY: Moves you 5 meters away from the origin
        this.playerGroup.position.set(0, 1.6, 5);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        World.build(this.scene); // Build the room and lights

        this.renderer.setAnimationLoop(() => this.update());
        console.log("Core Initialized: Black Screen Fix Applied.");
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
        // Smooth Movement Logic
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
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
