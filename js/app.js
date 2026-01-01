import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './environment.js';

const App = {
    scene: null, camera: null, renderer: null,
    player: new THREE.Group(), controllers: [],
    isSeated: false,

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111); // Ensure it's not pitch black

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.player.position.set(0, 0, 8); 
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
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
            
            // Placeholder Hand Mesh (Update 1.4 will add skin)
            const hand = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.05, 0.2), 
                new THREE.MeshStandardMaterial({ color: 0x00ffff })
            );
            controller.add(hand);
            this.controllers.push(controller);

            // Movement Logic: Squeeze Trigger to Walk
            controller.addEventListener('selectstart', () => {
                if(!this.isSeated) this.movePlayer();
            });
        }
    },

    movePlayer() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0; // Stay on the floor
        this.player.position.addScaledVector(direction, 1.0);

        // Auto-Seat check
        if(this.player.position.distanceTo(new THREE.Vector3(0, 0, -5)) < 3) {
            this.sitDown();
        }
    },

    sitDown() {
        this.isSeated = true;
        this.player.position.set(0, -0.5, -3.5); 
        this.showWinner("WALK SUCCESSFUL", "BALANCE: $5,000");
    },

    showWinner(name, hand) {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:20%; width:100%; text-align:center; color:#00FF00; font-size:40px; font-family:Arial; z-index:999;";
        div.innerHTML = `WINNER: ${name}<br>${hand}`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 10000);
    },

    render() {
        this.renderer.render(this.scene, this.camera);
    }
};

App.init();
