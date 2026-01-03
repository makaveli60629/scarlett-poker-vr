import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { WorldControl } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    playerGroup: new THREE.Group(),

    init() {
        // Fix for "Black Screen": Set background to a visible dark grey
        this.scene.background = new THREE.Color(0x222222);
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Oculus specific VR Button initialization
        const vrButton = VRButton.createButton(this.renderer);
        document.body.appendChild(vrButton);

        // PLAYER SPAWN: Height at 1.6m (eye level), 5m back from center
        this.playerGroup.position.set(0, 1.6, 5);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        WorldControl.init(this.scene);
        
        this.renderer.setAnimationLoop(() => this.render());
    },

    setupHands() {
        const handFactory = new XRHandModelFactory();
        // Hand 0 (Left), Hand 1 (Right) - Using Mesh only per request
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    },

    render() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                // Smooth Movement (Left Thumbstick)
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    const speed = 0.05;
                    this.playerGroup.position.x += axes[2] * speed;
                    this.playerGroup.position.z += axes[3] * speed;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
