import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './js/world.js';
import { Controls } from './js/controls.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false, 
        powerPreference: "high-performance" // Critical for Quest
    }),
    playerGroup: new THREE.Group(),

    async init() {
        // 1. Force XR Compatibility for Oculus
        const gl = this.renderer.getContext();
        if (gl.makeXRCompatible) await gl.makeXRCompatible();

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        
        // Use a dark grey instead of pure black to verify the screen is "on"
        this.scene.background = new THREE.Color(0x050505);

        document.body.appendChild(this.renderer.domElement);
        
        // Create the button with specific Oculus requirements
        const vrButton = VRButton.createButton(this.renderer, {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hand-tracking']
        });
        document.body.appendChild(vrButton);

        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        World.build(this.scene);
        Controls.init(this.renderer, this.scene, this.playerGroup);

        this.renderer.setAnimationLoop(this.render.bind(this));
    },

    render() {
        Controls.update(this.renderer, this.camera, this.playerGroup);
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
