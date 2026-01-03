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
        this.scene.background = new THREE.Color(0x0a0a0f); // Anti-black safety color
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        // SPAWN: Back-left corner of Lobby facing center
        this.playerGroup.position.set(-15, 0, -15);
        this.playerGroup.rotation.y = Math.PI / 4;
        this.camera.position.y = 1.6; // Permanent eye level
        
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.render());
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

    render() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                // 1. Controller Logic (Corrected Mapping)
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    if (source.handedness === 'left') {
                        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
                        dir.y = 0; dir.normalize();
                        const side = new THREE.Vector3().crossVectors(this.camera.up, dir).normalize();
                        this.playerGroup.position.addScaledVector(dir, -axes[3] * 0.1);
                        this.playerGroup.position.addScaledVector(side, axes[2] * 0.1);
                    }
                    if (source.handedness === 'right') {
                        if (Math.abs(axes[2]) > 0.8 && this.canSnapTurn) {
                            this.playerGroup.rotation.y -= (axes[2] > 0 ? Math.PI/4 : -Math.PI/4);
                            this.canSnapTurn = false;
                        } else if (Math.abs(axes[2]) < 0.1) { this.canSnapTurn = true; }
                    }
                }
                // 2. Hand Tracking Logic (Pinch to Glide)
                if (source.hand) {
                    const index = source.hand.get(8);
                    const thumb = source.hand.get(4);
                    if (index && thumb && index.position.distanceTo(thumb.position) < 0.02) {
                        const moveDir = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
                        moveDir.y = 0;
                        this.playerGroup.position.addScaledVector(moveDir.normalize(), 0.06);
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
