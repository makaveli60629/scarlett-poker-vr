import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './environment.js';

const App = {
    scene: null, camera: null, renderer: null,
    player: new THREE.Group(),
    
    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111); // Dark grey, not black

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Reset player to floor
        this.player.position.set(0, 0, 5); 
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
            
            // Hand Mesh - Smaller and distinct
            const handGeo = new THREE.BoxGeometry(0.05, 0.05, 0.1);
            const handMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            controller.add(new THREE.Mesh(handGeo, handMat));

            // Movement: Squeeze Trigger
            controller.addEventListener('selectstart', () => {
                const dir = new THREE.Vector3();
                this.camera.getWorldDirection(dir);
                dir.y = 0;
                this.player.position.addScaledVector(dir, 0.8);
            });
        }
    },

    render() {
        this.renderer.render(this.scene, this.camera);
    }
};

App.init();
