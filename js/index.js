import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance",
        xrCompatible: true 
    }),
    playerGroup: new THREE.Group(),
    teleportMarker: new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.45, 32),
        new THREE.MeshBasicMaterial({ color: 0xa020f0, side: THREE.DoubleSide })
    ),

    async init() {
        // Black Screen Fix
        const gl = this.renderer.getContext();
        if (gl.makeXRCompatible) await gl.makeXRCompatible();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.0; 
        this.renderer.setClearColor(0x111111);
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // SPAWN FIX: Level eye-height 1.6m, center of room
        this.playerGroup.position.set(0, 1.6, 0);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        // Ensure player stays level on session start
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.playerGroup.position.set(0, 1.6, 0);
            this.camera.position.set(0, 0, 0);
        });

        // Teleport Marker setup
        this.teleportMarker.rotation.x = -Math.PI/2;
        this.teleportMarker.visible = false;
        this.scene.add(this.teleportMarker);

        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            // Hands Only - No Controllers
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    
                    // LEFT STICK: Smooth Walk
                    if (source.handedness === 'left') {
                        const speed = 0.1;
                        this.playerGroup.position.x += (axes[2] || 0) * speed;
                        this.playerGroup.position.z += (axes[3] || 0) * speed;
                    }

                    // RIGHT STICK: Teleport Options
                    if (source.handedness === 'right') {
                        if (axes[3] < -0.5) { // Push Forward
                            this.aimTeleport();
                        } else if (this.teleportMarker.visible) {
                            // Execute Teleport
                            this.playerGroup.position.set(this.teleportMarker.position.x, 1.6, this.teleportMarker.position.z);
                            this.teleportMarker.visible = false;
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    },

    aimTeleport() {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.teleportMarker.position.copy(this.playerGroup.position).addScaledVector(dir, 10);
        this.teleportMarker.position.y = 0.01;
        this.teleportMarker.visible = true;
    },

    showWin(name, hand) {
        const ui = document.getElementById('win-ui');
        document.getElementById('win-name').innerText = name + " WINS!";
        document.getElementById('win-hand').innerText = hand;
        ui.style.display = 'block';
        setTimeout(() => { ui.style.display = 'none'; }, 10000);
    }
};

Core.init();
