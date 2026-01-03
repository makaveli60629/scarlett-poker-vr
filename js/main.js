import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"}),
    playerGroup: new THREE.Group(),

    async init(){
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // --------------------
        // Player Group Setup
        // --------------------
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);
        this.playerGroup.position.set(0,0,10);

        // --------------------
        // Build World
        // --------------------
        World.build(this.scene);

        // --------------------
        // Controls
        // --------------------
        Controls.init(this.renderer, this.scene, this.playerGroup, this.camera);

        // --------------------
        // UI
        // --------------------
        UI.init(this.scene, this.playerGroup);

        // --------------------
        // Animation Loop
        // --------------------
        this.renderer.setAnimationLoop(() => {
            Controls.update(this.renderer);
            UI.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
};

Core.init();Core.init();
