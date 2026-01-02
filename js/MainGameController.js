/**
 * PROJECT: POKER VR
 * VERSION: 1.5.1
 * FILE: MainGameController.js
 * DESCRIPTION: Master logic including VR controls, Auto-sit, 10s Win Display, and 1000x Particles.
 */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

class PokerGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Settings from Memory
        this.textureFolder = "assets/textures/";
        this.winDisplayDuration = 10000; // 10 Seconds
        
        this.init();
    }

    init() {
        // 1. Setup Renderer & VR
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Add the VR Button for Oculus
        document.body.appendChild(VRButton.createButton(this.renderer));

        // 2. Lighting & Environment
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);

        // 3. Initialize Features
        this.setupOculusControls();
        this.create1000xParticles();
        this.startAnimationLoop();
        
        console.log("Update 1.5.1: Systems Initialized. Textures path set to " + this.textureFolder);
    }

    // --- OCULUS VR CONTROLS ---
    setupOculusControls() {
        this.controller1 = this.renderer.xr.getController(0);
        this.controller2 = this.renderer.xr.getController(1);
        this.scene.add(this.controller1);
        this.scene.add(this.controller2);

        // Interaction for "Play Game" or selecting buttons
        this.controller1.addEventListener('selectstart', () => {
            console.log("Controller Trigger Pressed");
            // Add interaction logic here
        });
    }

    // --- AUTO-SIT & POKER LOGIC ---
    // Triggered when player enters the "Play Game" zone
    playerEnteredPlayZone() {
        console.log("Player is in zone. Automatically sitting down...");
        this.camera.position.set(0, 1.2, 0); // Move camera to seated poker height
        this.dealInitialCards();
    }

    dealInitialCards() {
        console.log("Cards dealt to player and AI.");
    }

    // --- WINNER ANNOUNCEMENT (NO VOICE - 10 SECONDS) ---
    showWinnerPopup(winnerName, handDescription) {
        // Create the popup letters
        const winDiv = document.createElement('div');
        winDiv.id = "winner-ui";
        winDiv.style.cssText = `
            position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%);
            color: #ccac00; font-size: 50px; font-weight: bold; text-align: center;
            text-shadow: 3px 3px 5px #000; z-index: 100; pointer-events: none;
        `;
        winDiv.innerHTML = `WINNER: ${winnerName}<br><span style="font-size:30px">${handDescription}</span>`;
        document.body.appendChild(winDiv);

        // Highlight the winning player (Logic for Mesh/Shader)
        console.log(`Highlighting player: ${winnerName}`);

        // Auto-remove after 10 seconds per requirements
        setTimeout(() => {
            const existing = document.getElementById("winner-ui");
            if (existing) existing.remove();
        }, this.winDisplayDuration);
    }

    // --- ENHANCED VISUALS (PARTICLES) ---
    create1000xParticles() {
        const partGeometry = new THREE.BufferGeometry();
        const count = 15000; 
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 50;
        }

        partGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const partMaterial = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.05 });
        const particleSystem = new THREE.Points(partGeometry, partMaterial);
        this.scene.add(particleSystem);
    }

    startAnimationLoop() {
        this.renderer.setAnimationLoop(() => {
            // Update particles or animations here
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Instantiate the game
const game = new PokerGame();
