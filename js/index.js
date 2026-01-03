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

        // SPAWN FIX: Place you safely 2 meters away from the center
        this.playerGroup.position.set(0, 0, 2); 
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        // Hand material is now Basic so it's always visible
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
            // Safety: Force Y to 0 so you never fall through or fly
            this.playerGroup.position.y = 0;

            for (const source of session.inputSources) {
                if (!source.gamepad) continue;
                const axes = source.gamepad.axes;

                // Move with Left Stick
                if (source.handedness === 'left') {
                    this.playerGroup.position.x += axes[2] * 0.08;
                    this.playerGroup.position.z += axes[3] * 0.08;
                }
                // Turn with Right Stick (45 degrees)
                if (source.handedness === 'right' && Math.abs(axes[2]) > 0.8 && this.canSnapTurn) {
                    this.playerGroup.rotation.y += (axes[2] > 0 ? -Math.PI/4 : Math.PI/4);
                    this.canSnapTurn = false;
                } else if (Math.abs(axes[2]) < 0.1) {
                    this.canSnapTurn = true;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
