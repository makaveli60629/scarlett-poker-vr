import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';
import { Controls } from './controls.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", precision: "lowp" }),
    playerGroup: new THREE.Group(),

    async init() {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');

        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hand-tracking']
        }));

        // ALIGNMENT: Camera must be at 0,0,0 inside the group. 
        // The XR session will automatically set the height based on your real life.
        this.camera.position.set(0, 0, 0); 
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        // START POSITION: Move the player to the middle of the Lobby (0, 0, 5)
        // This ensures you aren't spawning inside the wall at (0,0,0).
        this.playerGroup.position.set(0, 0, 5);

        World.build(this.scene); // We handle playerGroup inside World now
        Controls.init(this.renderer, this.scene, this.playerGroup);

        this.renderer.setAnimationLoop(() => this.render());
    },

    render() {
        Controls.update(this.renderer, this.camera, this.playerGroup);
        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
