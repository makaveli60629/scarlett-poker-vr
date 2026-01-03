import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    playerGroup: new THREE.Group(),
    teleportPad: null,
    isTeleporting: false,
    
    init() {
        this.scene.background = new THREE.Color(0x050505);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Spawn Safety: Nothing can enter this radius
        this.playerGroup.position.set(0, 0, 2); 
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupLights();
        this.setupRoom();
        this.setupHands();

        this.renderer.setAnimationLoop(() => this.update());
    },

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const spot = new THREE.SpotLight(0xffffff, 2);
        spot.position.set(0, 5, 0);
        this.scene.add(spot);
    },

    setupRoom() {
        // Table 1 (Main)
        this.createTable(0, 0, 0, 0x076324);
        // Table 2 (Secondary)
        this.createTable(-5, 0, -5, 0x1a1a1a); // Black felt table

        // Floor
        const grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
        this.scene.add(grid);

        // THE TELEPORT PAD (The Doorway)
        const padGeo = new THREE.TorusGeometry(0.8, 0.05, 16, 100);
        const padMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
        this.teleportPad = new THREE.Mesh(padGeo, padMat);
        this.teleportPad.rotation.x = Math.PI / 2;
        this.teleportPad.position.set(0, 0.1, 4); // Placed behind the main spawn
        this.scene.add(this.teleportPad);
    },

    createTable(x, y, z, color) {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: color })
        );
        table.position.set(x, 0.8, z);
        this.scene.add(table);
    },

    setupHands() {
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    },

    checkTeleport() {
        // Calculate distance between player and the teleport pad
        const distance = this.playerGroup.position.distanceTo(this.teleportPad.position);
        
        if (distance < 0.8 && !this.isTeleporting) {
            this.isTeleporting = true;
            // Teleport to Table 2
            this.playerGroup.position.set(-5, 0, -3); 
            
            // Short cooldown so you don't flicker back and forth
            setTimeout(() => { this.isTeleporting = false; }, 2000);
        }
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    this.playerGroup.position.x += (axes[2] || 0) * 0.05;
                    this.playerGroup.position.z += (axes[3] || 0) * 0.05;
                }
            }
            this.checkTeleport();
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
