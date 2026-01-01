import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './environment.js';

const App = {
    scene: null, camera: null, renderer: null,
    player: new THREE.Group(), controllers: [],
    isSeated: false,
    
    // THE 20 PHYSICS ITEMS (Pre-configured for 1.6)
    physics: { gravity: -0.005, friction: 0.98, bounciness: 0.2, airDrag: 0.99 },

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Starting Position
        this.player.position.set(0, 1.6, 5); 
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Start Environment
        World.build(this.scene);
        this.setupVR();
        this.renderer.setAnimationLoop(() => this.render());
    },

    setupVR() {
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            this.player.add(controller);
            
            // Visual Hand Mesh
            const hand = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x00ffff, wireframe: true })
            );
            controller.add(hand);
            this.controllers.push(controller);

            // Trigger Movement for Android/Oculus
            controller.addEventListener('selectstart', () => {
                if(!this.isSeated) {
                    const dir = new THREE.Vector3();
                    this.camera.getWorldDirection(dir);
                    dir.y = 0;
                    this.player.position.addScaledVector(dir, 1.0);
                    if(this.player.position.distanceTo(new THREE.Vector3(0, 1.6, -5)) < 3) this.sitDown();
                }
            });
        }
    },

    sitDown() {
        this.isSeated = true;
        this.player.position.set(0, 1.1, -3.5);
        this.showWinner("VR CONNECTED", "BALANCE: $5,000");
    },

    showWinner(name, hand) {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:15%; width:100%; text-align:center; color:#00FF00; font-size:40px; font-family:Arial; text-shadow: 2px 2px #000; z-index:9999;";
        div.innerHTML = `WINNER: ${name}<br>${hand}`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 10000); // 10 Second rule
    },

    render() {
        this.renderer.render(this.scene, this.camera);
    }
};

App.init();
