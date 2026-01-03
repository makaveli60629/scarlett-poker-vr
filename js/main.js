import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';
import { Controls } from './controls.js';
import { Dealer } from './dealer.js';

export const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: false }),
    playerGroup: new THREE.Group(),

    init() {
        // SAFETY: Force background to white so we know it loaded
        this.scene.background = new THREE.Color(0xffffff); 
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['hand-tracking'] 
        }));

        this.playerGroup.position.set(0, 0, 5);
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        World.build(this.scene);
        Controls.init(this.renderer, this.scene, this.playerGroup);
        Dealer.init(this.scene);

        this.renderer.setAnimationLoop(() => this.render());
    },

    render() {
        Controls.update(this.renderer, this.camera, this.playerGroup);
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
