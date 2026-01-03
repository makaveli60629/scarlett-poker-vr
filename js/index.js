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
        this.scene.background = new THREE.Color(0x050505);
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        const skinMat = new THREE.MeshBasicMaterial({ color: Logic.stats.complexion });

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
            for (const source of session.inputSources) {
                if (!source.gamepad) continue;
                const axes = source.gamepad.axes;

                // LEFT STICK: Smooth Movement
                if (source.handedness === 'left') {
                    const direction = new THREE.Vector3();
                    this.camera.getWorldDirection(direction);
                    direction.y = 0;
                    direction.normalize();
                    const sideDir = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();

                    this.playerGroup.position.addScaledVector(direction, -axes[3] * 0.06);
                    this.playerGroup.position.addScaledVector(sideDir, axes[2] * 0.06);
                }

                // RIGHT STICK: 45° Snap Turn
                if (source.handedness === 'right') {
                    const stickX = axes[2];
                    if (Math.abs(stickX) > 0.7) {
                        if (this.canSnapTurn) {
                            this.playerGroup.rotation.y += (stickX > 0 ? -Math.PI/4 : Math.PI/4);
                            this.canSnapTurn = false;
                        }
                    } else if (Math.abs(stickX) < 0.1) {
                        this.canSnapTurn = true;
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
