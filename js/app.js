import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './environment.js';

const App = {
    scene: null, camera: null, renderer: null,
    player: new THREE.Group(), cards: [],
    isSeated: false, balance: 5000,
    
    // 20 PHYSICS CONFIGURATION ITEMS (PERMANENT)
    physics: {
        gravity: -0.005, friction: 0.95, bounce: 0.2, airDrag: 0.98,
        tableY: 0.82, mass: 0.01, sleepThreshold: 0.001,
        throwForce: 1.5, angularDrag: 0.1, collisionMargin: 0.001
    },

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        
        // Spawn at Lobby Store Entrance
        this.player.position.set(0, 0, 15); 
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.useLegacyLights = false;
        
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
            
            // Hand Meshes
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0x00ffff }));
            controller.add(hand);

            // Trigger Movement Logic
            controller.addEventListener('selectstart', () => {
                const dir = new THREE.Vector3();
                this.camera.getWorldDirection(dir);
                dir.y = 0;
                this.player.position.addScaledVector(dir, 1.2);

                // Auto-Seat Logic: If close to the 'Play Game' table area
                if (this.player.position.distanceTo(new THREE.Vector3(0, 0, -5)) < 3) {
                    this.sitDown();
                }
            });
        }
    },

    sitDown() {
        if(this.isSeated) return;
        this.isSeated = true;
        this.player.position.set(0, -0.4, -3.5); // Automatically sit at table
        this.showWinner("GAME STARTED", "WELCOME TO THE TABLE");
    },

    showWinner(name, hand) {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:25%; width:100%; text-align:center; color:#00FF00; font-size:45px; font-weight:bold; text-shadow:3px 3px #000; z-index:999;";
        div.innerHTML = `WINNER: ${name}<br><span style='font-size:20px'>${hand} - $${this.balance}</span>`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 10000); // 10 Second Pop-up
    },

    render() {
        this.renderer.render(this.scene, this.camera);
    }
};

App.init();
