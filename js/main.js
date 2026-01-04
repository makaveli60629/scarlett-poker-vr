import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './js/world.js';
import { Controls } from './js/controls.js';
import { Interactions } from './js/interactions.js';
import { UI } from './js/ui.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.playerGroup = new THREE.Group();

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Add player group
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        // Spawn position facing table
        this.playerGroup.position.set(0, 0, 8);

        // Build world and objects
        World.build(this.scene);

        // Initialize controls
        Controls.init(this.renderer, this.scene, this.playerGroup);

        // Initialize interactions
        Interactions.init(this.scene, this.playerGroup);

        // Initialize UI
        UI.init(this.scene);

        // Start animation loop
        this.renderer.setAnimationLoop(() => {
            Controls.update();
            Interactions.update();
            UI.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
}

new Game();
