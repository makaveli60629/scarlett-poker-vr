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
        
        // Safety Background (Dark Blue) so "Black" never happens
        this.scene.background = new THREE.Color(0x050510);
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        // SPAWN AUDIT
        this.playerGroup.position.set(-15, 0, -15); 
        this.camera.position.y = 1.6; 
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.render());
    },

    setupHands() {
        this.handFactory = new XRHandModelFactory();
        this.skinMat = new THREE.MeshStandardMaterial({ color: Logic.stats.complexion });

        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            const model = this.handFactory.createHandModel(hand, 'mesh');
            hand.add(model);
            hand.addEventListener('connected', () => {
                model.traverse(c => { if(c.isMesh) c.material = this.skinMat; });
            });
            this.playerGroup.add(hand);
        }
    },

    render() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                // 1. CONTROLLER LOGIC
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    if (source.handedness === 'left') {
                        // Forward/Back is axes[3], Left/Right is axes[2]
                        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                        dir.y = 0; dir.normalize();
                        const side = new THREE.Vector3().crossVectors(this.camera.up, dir).normalize();
                        
                        this.playerGroup.position.addScaledVector(dir, -axes[3] * 0.1);
                        this.playerGroup.position.addScaledVector(side, axes[2] * 0.1);
                    }
                    if (source.handedness === 'right') {
                        // Snap Turn Logic
                        if (Math.abs(axes[2]) > 0.8 && this.canSnapTurn) {
                            this.playerGroup.rotation.y -= (axes[2] > 0 ? Math.PI/4 : -Math.PI/4);
                            this.canSnapTurn = false;
                        } else if (Math.abs(axes[2]) < 0.1) {
                            this.canSnapTurn = true;
                        }
                    }
                }
                
                // 2. HAND TRACKING SAFETY (The switch fix)
                if (source.hand) {
                    const indexTip = source.hand.get(8);
                    const thumbTip = source.hand.get(4);
                    // Only run if both joints are tracked (prevents black screen crash)
                    if (indexTip && thumbTip) {
                        const dist = indexTip.position.distanceTo(thumbTip.position);
                        if (dist < 0.02) { // Pinching
                            const moveDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                            moveDir.y = 0;
                            this.playerGroup.position.addScaledVector(moveDir.normalize(), 0.05);
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
