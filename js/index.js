import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';
import { Controls } from './controls.js'; // New link

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    playerGroup: new THREE.Group(),

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.scene.background = new THREE.Color(0xffffff); // Full bright

        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        World.build(this.scene);
        Controls.init(this.scene, this.playerGroup); // Start the new control center

        this.renderer.setAnimationLoop(() => this.render());
    },

    render() {
        Controls.update(this.renderer, this.camera, this.playerGroup);
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
