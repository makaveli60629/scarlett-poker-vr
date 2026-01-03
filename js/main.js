import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';
import { Controls } from './controls.js';

/**
 * POKER VR - PERMANENT MASTER LOGIC 
 * Update: 4.0 - Modular Consolidation
 */
const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance",
        precision: "highp"
    }),
    playerGroup: new THREE.Group(),

    async init() {
        // 1. Force XR Compatibility for Quest hardware
        const gl = this.renderer.getContext();
        if (gl.makeXRCompatible) await gl.makeXRCompatible();

        // 2. Renderer Setup
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        
        document.body.appendChild(this.renderer.domElement);

        // 3. Add the VR Button with Permissions
        const vrButton = VRButton.createButton(this.renderer, {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hand-tracking']
        });
        document.body.appendChild(vrButton);

        // 4. Setup Player Rig
        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);

        // 5. Build World (Passing both Scene and PlayerGroup as your code requires)
        World.build(this.scene, this.playerGroup);
        
        // 6. Initialize Hands and Movement
        Controls.init(this.renderer, this.scene, this.playerGroup);

        // 7. Start the Animation Loop
        this.renderer.setAnimationLoop(() => this.render());
    },

    render() {
        // Update Hand Positions and Movement Logic
        Controls.update(this.renderer, this.camera, this.playerGroup);
        
        // Final Render
        this.renderer.render(this.scene, this.camera);
    }
};

// Launch Game
Core.init();
