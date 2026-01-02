/**
 * POKER VR - PERMANENT MASTER LOGIC
 * Update: 1.5.1
 * Location: JS/MainGameController.js
 */
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

class PokerGame {
    constructor() {
        // Core Engine Components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Memory-Stored Variables
        this.texturePath = "assets/textures/";
        this.winDisplayTime = 10000; // 10 seconds for winner popup

        this.init();
    }

    init() {
        // Renderer Setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.setClearColor(0x050505); // Very dark grey, not pure black
        document.body.appendChild(this.renderer.domElement);
        
        // Add Oculus VR Button
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Lighting (Permanent Setup)
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 7);
        this.scene.add(sun);

        // Grid/Floor so you aren't lost in the dark
        const floorGrid = new THREE.GridHelper(20, 20, 0x00ffcc, 0x222222);
        this.scene.add(floorGrid);

        // Start Systems
        this.setupOculusControls();
        this.initMegaParticles();
        this.animate();

        console.log("Poker VR 1.5.1: Permanent Logic Loaded.");
    }

    // --- OCULUS CONTROLS (ALWAYS INCLUDED) ---
    setupOculusControls() {
        this.controller1 = this.renderer.xr.getController(0);
        this.controller2 = this.renderer.xr.getController(1);
        this.scene.add(this.controller1);
        this.scene.add(this.controller2);
        
        // Trigger interaction
        this.controller1.addEventListener('selectstart', () => {
            console.log("Trigger Pressed - Checking for 'Play Game' zone...");
            this.handlePlayerSitting();
        });
    }

    // --- LOBBY & PLAY LOGIC ---
    handlePlayerSitting() {
        // Logic: When moving to "Play Game" area, cards are dealt automatically.
        console.log("Player is now seated. Dealing cards...");
        // (Next update will add specific card mesh logic here)
    }

    // --- WINNER DISPLAY (10 SECONDS - NO VOICE) ---
    showWinner(name, handDetails) {
        const ui = document.getElementById('winner-ui');
        ui.innerHTML = `<h1>${name} WINS</h1><p>${handDetails}</p>`;
        ui.style.display = 'block';

        // Winning hand highlight logic would go here
        
        setTimeout(() => {
            ui.style.display = 'none';
        }, this.winDisplayTime);
    }

    // --- VISUALS: 1000x PARTICLE ANALYSIS ---
    initMegaParticles() {
        const geo = new THREE.BufferGeometry();
        const pos = [];
        for (let i = 0; i < 15000; i++) {
            pos.push((Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.03 });
        this.scene.add(new THREE.Points(geo, mat));
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Start Game
new PokerGame();
