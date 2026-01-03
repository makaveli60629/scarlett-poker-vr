import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';
import { Logic } from './logic.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: true }),
    playerGroup: new THREE.Group(),
    canSnapTurn: true,

    async init() {
        // High-fidelity renderer settings
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        
        document.body.appendChild(this.renderer.domElement);
        // Create the VR Button - This is what pulls you from "Flat" to "VR"
        const vrButton = VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking', 'layers'] 
        });
        document.body.appendChild(vrButton);

        // SPAWN: Center of Lobby, but 5 meters back so you have space
        this.playerGroup.position.set(0, 0, 5);
        this.camera.position.y = 1.6; // Eye level
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        this.setupHands();
        World.build(this.scene);

        // Start the loop
        this.renderer.setAnimationLoop(this.render.bind(this));
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        const skinMat = new THREE.MeshStandardMaterial({ color: Logic.stats.complexion, roughness: 0.8 });
        
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            const model = factory.createHandModel(hand, 'mesh');
            hand.add(model);
            hand.addEventListener('connected', () => {
                model.traverse(c => { if(c.isMesh) c.material = skinMat; });
            });
            this.playerGroup.add(hand);
        }
    },

    render() {
        this.handleMovement();
        this.renderer.render(this.scene, this.camera);
    },

    handleMovement() {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            if (!source.gamepad) continue;
            const axes = source.gamepad.axes;

            // Movement (Left Stick)
            if (source.handedness === 'left') {
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                forward.y = 0; forward.normalize();
                const right = new THREE.Vector3().crossVectors(this.camera.up, forward).normalize();

                this.playerGroup.position.addScaledVector(forward, -axes[3] * 0.1);
                this.playerGroup.position.addScaledVector(right, -axes[2] * 0.1);
            }

            // Snap Turn (Right Stick)
            if (source.handedness === 'right') {
                if (Math.abs(axes[2]) > 0.8 && this.canSnapTurn) {
                    this.playerGroup.rotation.y += (axes[2] > 0 ? -Math.PI/4 : Math.PI/4);
                    this.canSnapTurn = false;
                } else if (Math.abs(axes[2]) < 0.1) {
                    this.canSnapTurn = true;
                }
            }
        }
    }
};

Core.init();
