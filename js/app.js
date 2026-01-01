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
        
        // Spawn for Oculus height
        this.player.position.set(0, 0, 5); 
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Initialize Environment Module
        World.build(this.scene);
        
        this.setupVRControls();
        this.animate();
    },

    setupVRControls() {
        // Hand Meshes for Oculus
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            this.player.add(controller);
            
            const hand = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.2),
                new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
            );
            controller.add(hand);
            this.controllers.push(controller);

            // Trigger mapping for movement since you have no keyboard
            controller.addEventListener('selectstart', () => {
                if(!this.isSeated) this.moveForward();
            });
        }
    },

    moveForward() {
        // Move the player toward where they are looking
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.player.position.addScaledVector(direction, 0.5);

        // Auto-Seat Check
        if(this.player.position.z < -2) this.sitDown();
    },

    sitDown() {
        if(this.isSeated) return;
        this.isSeated = true;
        this.player.position.set(0, -0.5, -3.5); // Adjust for sitting height
        this.showWinnerPopup("1.5.2 ACTIVE", "VR READY");
    },

    showWinnerPopup(name, hand) {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:20%; width:100%; text-align:center; color:#00FF00; font-size:40px; font-family:Arial;";
        div.innerHTML = `WINNER: ${name}<br>${hand}`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 10000);
    },

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }
};

App.init();
