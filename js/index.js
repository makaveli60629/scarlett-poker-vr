import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';
import { Logic } from './logic.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, precision: "highp" }),
    playerGroup: new THREE.Group(),
    canSnapTurn: true,

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        
        // Solid grey skybox to ensure you can see everything
        this.scene.background = new THREE.Color(0x333333);
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        // Initial Spawn: Clear of any potential center-point errors
        this.playerGroup.position.set(0, 0, 2); 
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        const skinMat = new THREE.MeshPhongMaterial({ color: Logic.stats.complexion });
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

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            // 1. Height Safety: Force player to floor level
            if (this.playerGroup.position.y !== 0) this.playerGroup.position.y = 0;

            for (const source of session.inputSources) {
                // CONTROLLER MOVEMENT
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    if (source.handedness === 'left') {
                        this.playerGroup.position.x += axes[2] * 0.08;
                        this.playerGroup.position.z += axes[3] * 0.08;
                    }
                    if (source.handedness === 'right' && Math.abs(axes[2]) > 0.8 && this.canSnapTurn) {
                        this.playerGroup.rotation.y += (axes[2] > 0 ? -Math.PI/4 : Math.PI/4);
                        this.canSnapTurn = false;
                    } else if (source.handedness === 'right' && Math.abs(axes[2]) < 0.1) {
                        this.canSnapTurn = true;
                    }
                }

                // FINGER MOVEMENT (Pinch to Move Forward)
                if (source.hand) {
                    const indexTip = source.hand.get(8); // Index Finger
                    const thumbTip = source.hand.get(4); // Thumb
                    if (indexTip && thumbTip) {
                        const dist = indexTip.position.distanceTo(thumbTip.position);
                        if (dist < 0.02) { // Pinching
                            const direction = new THREE.Vector3();
                            this.camera.getWorldDirection(direction);
                            direction.y = 0;
                            this.playerGroup.position.addScaledVector(direction, 0.05);
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
