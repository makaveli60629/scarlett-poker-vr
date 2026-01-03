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
        
        // Studio environment background
        this.scene.background = new THREE.Color(0x11111b);
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        // SPAWN: Corner of Lobby, 1.6m eye level
        this.playerGroup.position.set(-15, 0, -15); 
        this.playerGroup.rotation.y = Math.PI / 4; 
        this.camera.position.y = 1.6;

        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        const skinMat = new THREE.MeshStandardMaterial({ color: Logic.stats.complexion });
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

                // MOVEMENT (Left Stick) - Corrected Inversion
                if (source.handedness === 'left') {
                    const dir = new THREE.Vector3();
                    this.camera.getWorldDirection(dir);
                    dir.y = 0; dir.normalize();
                    const side = new THREE.Vector3().crossVectors(this.camera.up, dir).normalize();

                    // axes[3] = forward/back, axes[2] = left/right
                    this.playerGroup.position.addScaledVector(dir, -axes[3] * 0.1); 
                    this.playerGroup.position.addScaledVector(side, axes[2] * 0.1);
                }

                // SNAP TURN (Right Stick) - Corrected Inversion
                if (source.handedness === 'right' && Math.abs(axes[2]) > 0.7 && this.canSnapTurn) {
                    // Pushing right (positive axes[2]) now turns you right (negative rotation)
                    this.playerGroup.rotation.y -= (axes[2] > 0 ? Math.PI/4 : -Math.PI/4);
                    this.canSnapTurn = false;
                } else if (source.handedness === 'right' && Math.abs(axes[2]) < 0.1) {
                    this.canSnapTurn = true;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
