import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }),
    playerGroup: new THREE.Group(),
    teleportMarker: new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.35, 32),
        new THREE.MeshBasicMaterial({ color: 0xa020f0, side: THREE.DoubleSide })
    ),

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.0; // SUPER BRIGHT
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Spawn: Eye level, in the center of the giant Lobby
        this.playerGroup.position.set(0, 1.6, 0);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        // Teleport Marker
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
            hand.add(handFactory.createHandModel(hand, 'mesh')); // PERMANENT: Hands Only
            this.playerGroup.add(hand);
        }
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes; // [x, y, thumb_x, thumb_y]
                    
                    // LEFT THUMBSTICK: Smooth Walk
                    if (source.handedness === 'left') {
                        this.playerGroup.position.x += (axes[2] || 0) * 0.1;
                        this.playerGroup.position.z += (axes[3] || 0) * 0.1;
                    }

                    // RIGHT THUMBSTICK UP: Teleport Target
                    if (source.handedness === 'right') {
                        if (axes[3] < -0.5) { // Pushing forward
                            this.showTeleportRay(source);
                        } else if (this.teleportMarker.visible) {
                            // Release to Teleport
                            this.playerGroup.position.set(this.teleportMarker.position.x, 1.6, this.teleportMarker.position.z);
                            this.teleportMarker.visible = false;
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    },

    showTeleportRay(source) {
        // Simple logic: Project marker 5 meters ahead of player direction
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.teleportMarker.position.copy(this.playerGroup.position).addScaledVector(dir, 5);
        this.teleportMarker.position.y = 0.01; // Snap to floor
        this.teleportMarker.visible = true;
    }
};

Core.init();
