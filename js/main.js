import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const App = {
    scene: null,
    camera: null,
    renderer: null,
    player: new THREE.Group(),
    controllers: [],
    isSeated: false,

    init() {
        this.setupScene();
        this.createEnvironment(); 
        this.setupControls();
        this.animate();
        
        // Ensure VR Button is available for Oculus
        document.body.appendChild(VRButton.createButton(this.renderer));
    },

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a); // Deep dark lobby

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // FIX: Spawning you at Z: 5 so you aren't inside the wall or the gray disc
        this.player.position.set(0, 1.6, 5); 
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Lighting to see the "Lively" background
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 7.5);
        this.scene.add(sun);
        this.scene.add(new THREE.AmbientLight(0x404040, 2));
    },

    createEnvironment() {
        // The Lobby - Brick Texture logic from 1.4 will be applied here
        const roomGeo = new THREE.BoxGeometry(30, 15, 60);
        const roomMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.BackSide });
        const lobby = new THREE.Mesh(roomGeo, roomMat);
        this.scene.add(lobby);

        // THE POKER TABLE (The gray disc)
        const tableGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a }); // Green Felt
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.9, -5); // Positioned in front of spawn
        this.scene.add(table);
    },

    setupControls() {
        // 1. OCULUS CONTROLS (Always kept in history)
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            this.player.add(controller);
            this.controllers.push(controller);
            
            // Hand Mesh Placeholders
            const hand = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.15),
                new THREE.MeshBasicMaterial({ color: 0x00ffff })
            );
            controller.add(hand);
        }

        // 2. FLAT SCREEN FIX: WASD & Mouse Look logic
        window.addEventListener('keydown', (e) => {
            if (this.isSeated) return;
            const speed = 0.3;
            if (e.key.toLowerCase() === 'w') this.player.position.z -= speed;
            if (e.key.toLowerCase() === 's') this.player.position.z += speed;
            if (e.key.toLowerCase() === 'a') this.player.position.x -= speed;
            if (e.key.toLowerCase() === 'd') this.player.position.x += speed;

            // Trigger "Play Game" Auto-Seat
            if (this.player.position.distanceTo(new THREE.Vector3(0, 1.6, -5)) < 3) {
                this.sitDown();
            }
        });
    },

    sitDown() {
        if (this.isSeated) return;
        this.isSeated = true;
        // Snap to table position
        this.player.position.set(0, 1.1, -3.5); 
        console.log("Automatically seated. Initializing winning hand logic...");
    },

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }
};

App.init();
