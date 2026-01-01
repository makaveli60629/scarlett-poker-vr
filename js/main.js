import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class PokerMegaUpdate {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        // 1.5.1 Mega Particles Group
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Ensure VR Button is Visible and Functional
        const vrBtn = VRButton.createButton(this.renderer);
        vrBtn.style.background = "#00ffcc";
        vrBtn.style.color = "#000";
        document.body.appendChild(vrBtn);

        // Position Camera so you aren't inside a wall (Fixes Black Screen)
        this.camera.position.set(0, 1.6, 3); 

        this.createEnvironment();
        this.setupOculusControls();
        this.createMegaParticles(); // Update 1.5.1 Feature

        this.renderer.setAnimationLoop(() => this.update());
    }

    createEnvironment() {
        // Lights
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 7.5);
        this.scene.add(sun, new THREE.AmbientLight(0x404040, 2));

        // Use your assets: Checker floor.jpg
        const loader = new THREE.TextureLoader();
        const floorTex = loader.load('../Checker floor.jpg');
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.MeshStandardMaterial({ map: floorTex })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Poker Table with your Felt asset
        const feltTex = loader.load('../poker_felt_scarlett.jpg');
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.2, 64),
            new THREE.MeshStandardMaterial({ map: feltTex })
        );
        table.position.set(0, 0.8, -4);
        this.scene.add(table);
    }

    createMegaParticles() {
        // Update 1.5.1: High-performance particle system for wins
        const geometry = new THREE.SphereGeometry(0.02, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        for (let i = 0; i < 500; i++) {
            const p = new THREE.Mesh(geometry, material);
            p.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 5,
                (Math.random() - 0.5) * 10 - 4
            );
            p.userData.velocity = Math.random() * 0.02;
            p.visible = false; // Hidden until win
            this.particleGroup.add(p);
        }
    }

    setupOculusControls() {
        this.controller1 = this.renderer.xr.getController(0); // Left
        this.controller2 = this.renderer.xr.getController(1); // Right
        this.scene.add(this.controller1, this.controller2);

        // Mappings: Right=Bet, Left=Fold
        this.controller2.addEventListener('selectstart', () => this.triggerWinSequence());
        this.controller1.addEventListener('selectstart', () => console.log("Fold Action"));
    }

    triggerWinSequence() {
        // Update 1.5: 10-second silent win
        const ui = document.getElementById('win-announcement');
        document.getElementById('winner-name').innerText = "YOU WIN!";
        document.getElementById('winning-hand').innerText = "ROYAL FLUSH";
        ui.style.display = 'block';

        // Update 1.5.1: Activate Mega Particles
        this.particleGroup.children.forEach(p => p.visible = true);

        setTimeout(() => {
            ui.style.display = 'none';
            this.particleGroup.children.forEach(p => p.visible = false);
        }, 10000);
    }

    update() {
        const time = this.clock.getElapsedTime();
        
        // Animate Mega Particles
        this.particleGroup.children.forEach(p => {
            if(p.visible) {
                p.position.y += p.userData.velocity;
                if(p.position.y > 4) p.position.y = 0;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
}

new PokerMegaUpdate();
