import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './environment.js';

const App = {
    scene: null, camera: null, renderer: null,
    player: new THREE.Group(), controllers: [],
    isSeated: false,

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Fix: Start at 0 height. The Headset will add your real height.
        this.player.position.set(0, 0, 5); 
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        
        // Ensure the scene is visible even if textures fail
        this.renderer.setClearColor(0x222222); 

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        World.build(this.scene);
        this.setupVR();
        this.renderer.setAnimationLoop(() => this.render());
    },

    setupVR() {
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            this.player.add(controller);
            
            // Hand Mesh
            const hand = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.05, 0.15), 
                new THREE.MeshStandardMaterial({ color: 0x00ffff })
            );
            controller.add(hand);

            // Movement: Squeeze Trigger to move where you look
            controller.addEventListener('selectstart', () => {
                const dir = new THREE.Vector3();
                this.camera.getWorldDirection(dir);
                dir.y = 0; // Keep movement on the floor
                this.player.position.addScaledVector(dir, 0.8);
            });
        }
    },

    render() {
        this.renderer.render(this.scene, this.camera);
    }
};

App.init();
