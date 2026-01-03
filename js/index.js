import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';
import { Logic } from './logic.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    playerGroup: new THREE.Group(),
    canSnapTurn: true,

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        // SPAWN AUDIT: Start in the corner of the Lobby
        this.playerGroup.position.set(-15, 0, -15);
        this.camera.position.y = 1.6; // Eye Level
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

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
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    if (source.handedness === 'left') this.move(axes[2] * 0.08, axes[3] * 0.08);
                    if (source.handedness === 'right') this.handleTurn(axes[2]);
                }
                // Pinch to move
                if (source.hand) {
                    const index = source.hand.get(8);
                    const thumb = source.hand.get(4);
                    if (index && thumb && index.position.distanceTo(thumb.position) < 0.02) {
                        const dir = new THREE.Vector3();
                        this.camera.getWorldDirection(dir);
                        dir.y = 0;
                        this.move(dir.x * 0.05, dir.z * 0.05);
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    },

    move(dx, dz) {
        const next = this.playerGroup.position.clone().add(new THREE.Vector3(dx, 0, dz));
        const sphere = new THREE.Sphere(next, 0.4);
        if (!World.colliders.some(c => c.intersectsSphere(sphere))) {
            this.playerGroup.position.add(new THREE.Vector3(dx, 0, dz));
        }
    },

    handleTurn(val) {
        if (Math.abs(val) > 0.8 && this.canSnapTurn) {
            this.playerGroup.rotation.y += (val > 0 ? -Math.PI/4 : Math.PI/4);
            this.canSnapTurn = false;
        } else if (Math.abs(val) < 0.1) {
            this.canSnapTurn = true;
        }
    }
};
Core.init();
