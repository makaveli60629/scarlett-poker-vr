import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';
import { Logic } from './logic.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    // FIXED: Added highp precision and powerPreference for Quest stability
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        precision: "highp", 
        powerPreference: "high-performance" 
    }),
    playerGroup: new THREE.Group(),

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.render());
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

    render() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    this.playerGroup.position.x += (axes[2] || 0) * 0.08;
                    this.playerGroup.position.z += (axes[3] || 0) * 0.08;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
