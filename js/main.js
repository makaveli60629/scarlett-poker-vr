import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Update 1.4: Hologram Shader with Noise
const HologramShader = {
    uniforms: {
        "time": { value: 1.0 },
        "color": { value: new THREE.Color(0x00ffcc) }
    },
    vertexShader: `
        varying vec2 vUv;
        uniform float time;
        void main() {
            vUv = uv;
            vec3 pos = position;
            pos.y += sin(pos.x * 5.0 + time) * 0.02; // Noise jitter
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        uniform vec3 color;
        void main() {
            float scanline = sin(vUv.y * 100.0 + time * 5.0) * 0.1;
            float alpha = 0.3 + scanline;
            gl_FragColor = vec4(color, alpha);
        }
    `
};

class PokerVR {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.gameState = 'ZONE'; // ZONE or AT_TABLE
        this.wallet = 5000.00;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Environment
        const grid = new THREE.GridHelper(20, 20, 0x00ffcc, 0x222222);
        this.scene.add(grid);
        
        this.createZoneHologram();
        this.createPokerTable();
        this.setupOculusControls();

        this.renderer.setAnimationLoop((t) => this.render(t));
    }

    createZoneHologram() {
        // Floating platform for Wallet display in Zone
        const geo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32);
        this.hologramMat = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(HologramShader.uniforms),
            vertexShader: HologramShader.vertexShader,
            fragmentShader: HologramShader.fragmentShader,
            transparent: true
        });
        const platform = new THREE.Mesh(geo, this.hologramMat);
        platform.position.set(0, 0.01, -2);
        this.scene.add(platform);
    }

    createPokerTable() {
        // Table at z = -5
        const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 64);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x076324 });
        this.table = new THREE.Mesh(tableGeo, tableMat);
        this.table.position.set(0, 0.8, -6);
        this.scene.add(this.table);

        // Invisible trigger for "Play Game" spot
        const triggerGeo = new THREE.BoxGeometry(2, 2, 2);
        const triggerMat = new THREE.MeshBasicMaterial({ visible: false });
        this.seatTrigger = new THREE.Mesh(triggerGeo, triggerMat);
        this.seatTrigger.position.set(0, 1, -4.5);
        this.scene.add(this.seatTrigger);
    }

    setupOculusControls() {
        // PERMANENT MEMORY: OCULUS CONFIGURATIONS
        // Right Controller: Bet / Raise (Trigger)
        // Left Controller: Fold / Check (Trigger)
        // A Button: Call
        // X Button: Menu
        
        this.controller1 = this.renderer.xr.getController(0);
        this.controller2 = this.renderer.xr.getController(1);
        
        const factory = new XRControllerModelFactory();
        
        const model1 = factory.createControllerModel(this.controller1);
        this.controller1.add(model1);
        this.scene.add(this.controller1);

        const model2 = factory.createControllerModel(this.controller2);
        this.controller2.add(model2);
        this.scene.add(this.controller2);

        // Trigger Events
        this.controller1.addEventListener('selectstart', () => this.onInteraction('RIGHT'));
        this.controller2.addEventListener('selectstart', () => this.onInteraction('LEFT'));
    }

    onInteraction(side) {
        if (this.gameState === 'ZONE') {
            // Auto-sit logic (v1.3)
            this.sitAtTable();
        } else {
            console.log(`${side} Trigger Pressed: Poker Action Taken`);
        }
    }

    sitAtTable() {
        this.gameState = 'AT_TABLE';
        document.getElementById('vr-ui-overlay').style.display = 'none';
        
        // Move Camera/Player to Table Position
        this.camera.position.set(0, 1.2, -4.5); 
        console.log("Player Seated. Dealing Cards...");
        
        // Simulate a win for testing 1.5 Reveal
        setTimeout(() => this.triggerWin("Player 1", "Full House"), 3000);
    }

    triggerWin(name, hand) {
        // Update 1.5: Silent Win Display
        const winUI = document.getElementById('win-announcement');
        document.getElementById('winner-name').innerText = `${name.toUpperCase()} WINS THE POT`;
        document.getElementById('win-hand-details').innerText = hand;
        
        winUI.style.display = 'block';
        
        // Highlight winning player/cards logic
        this.table.material.emissive.setHex(0xffd700);
        this.table.material.emissiveIntensity = 0.5;

        setTimeout(() => {
            winUI.style.display = 'none';
            this.table.material.emissiveIntensity = 0;
        }, 10000); // 10 second duration
    }

    render(time) {
        time *= 0.001;
        this.hologramMat.uniforms.time.value = time;
        
        // Logic to detect if player is standing in the "Play Game" zone
        if (this.gameState === 'ZONE') {
            const dist = this.camera.position.distanceTo(this.seatTrigger.position);
            if (dist < 1.2) this.sitAtTable();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start Game
const app = new PokerVR();
