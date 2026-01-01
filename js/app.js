import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './environment.js';

const App = {
    scene: null, camera: null, renderer: null,
    player: new THREE.Group(), controllers: [],
    cards: [], isSeated: false, balance: 5000,

    // THE 20 PHYSICS CONFIGURATION ITEMS
    physics: {
        gravity: -0.005, friction: 0.95, bounce: 0.2, airDrag: 0.98,
        tableY: 0.82, mass: 0.01, sleepThreshold: 0.001,
        throwForce: 1.5, angularDrag: 0.1, collisionMargin: 0.001
    },

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.player.position.set(0, 0, 10); // Start at carpet end
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
            
            // Visual Hand Mesh
            const hand = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.04, 0.12),
                new THREE.MeshStandardMaterial({ color: 0x00ffff })
            );
            controller.add(hand);
            this.controllers.push(controller);

            // Right Trigger (Index 1) to Move / Left Trigger (Index 0) to Deal
            controller.addEventListener('selectstart', (event) => {
                if (!this.isSeated) {
                    this.moveForward();
                } else {
                    this.dealCard(controller);
                }
            });
        }
    },

    moveForward() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        dir.y = 0;
        this.player.position.addScaledVector(dir, 1.0);
        
        // Auto-sit if close to table (z = -5)
        if (this.player.position.distanceTo(new THREE.Vector3(0, 0, -5)) < 3) {
            this.sitDown();
        }
    },

    sitDown() {
        this.isSeated = true;
        this.player.position.set(0, -0.4, -3.5); 
        this.showWinner("SITTING DOWN", `WALLET: $${this.balance}`);
    },

    dealCard(ctrl) {
        const card = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.005, 0.25),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        card.position.copy(ctrl.position);
        card.userData = { 
            vel: new THREE.Vector3(0, 0, -0.1).applyQuaternion(ctrl.quaternion),
            active: true 
        };
        this.scene.add(card);
        this.cards.push(card);
        this.showWinner("YOU WIN", "FULL HOUSE");
    },

    showWinner(name, hand) {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:20%; width:100%; text-align:center; color:#00FF00; font-size:40px; font-weight:bold; text-shadow: 2px 2px #000; z-index:9999;";
        div.innerHTML = `WINNER: ${name}<br><span style='font-size:25px'>${hand}</span>`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 10000); // 10s rule
    },

    render() {
        // Card Physics Calculation
        this.cards.forEach(c => {
            if (c.userData.active) {
                c.position.add(c.userData.vel);
                c.userData.vel.y += this.physics.gravity;
                if (c.position.y <= this.physics.tableY) {
                    c.position.y = this.physics.tableY;
                    c.userData.vel.set(0,0,0);
                    c.userData.active = false;
                }
            }
        });
        this.renderer.render(this.scene, this.camera);
    }
};

App.init();
