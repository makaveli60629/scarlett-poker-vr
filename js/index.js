import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';
import { Logic } from './logic.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, precision: "highp" }),
    playerGroup: new THREE.Group(),
    canSnapTurn: true,
    movementSpeed: 0.08,

    async init() {
        // Renderer Setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 
            optionalFeatures: ['local-floor', 'hand-tracking'] 
        }));

        // --- SPAWN AUDIT ---
        // Placing you in the corner of the Lobby (0,0 room)
        this.playerGroup.position.set(-15, 0, -15);
        this.playerGroup.rotation.y = Math.PI / 4; // Face the center
        this.scene.add(this.playerGroup);

        // --- CAMERA AUDIT (Eye Level) ---
        this.camera.position.y = 1.6; 
        this.playerGroup.add(this.camera);

        // Initialize World & Hands
        this.setupHands();
        World.build(this.scene);

        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        const skinMat = new THREE.MeshPhongMaterial({ color: Logic.stats.complexion });

        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            const model = factory.createHandModel(hand, 'mesh');
            hand.add(model);
            
            hand.addEventListener('connected', () => {
                model.traverse(c => { if(c.isMesh) c.material = skinMat; });
            });
            this.playerGroup.add(hand);
        }
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            // --- CONTROLLER MOVEMENT ---
            if (source.gamepad) {
                const axes = source.gamepad.axes;

                // Left Stick: Move
                if (source.handedness === 'left') {
                    const dir = new THREE.Vector3();
                    this.camera.getWorldDirection(dir);
                    dir.y = 0; dir.normalize();
                    const side = new THREE.Vector3().crossVectors(this.camera.up, dir).normalize();

                    const moveX = (dir.x * -axes[3] + side.x * axes[2]) * this.movementSpeed;
                    const moveZ = (dir.z * -axes[3] + side.z * axes[2]) * this.movementSpeed;

                    this.attemptMove(moveX, moveZ);
                }

                // Right Stick: Snap Turn
                if (source.handedness === 'right') {
                    if (Math.abs(axes[2]) > 0.8 && this.canSnapTurn) {
                        this.playerGroup.rotation.y += (axes[2] > 0 ? -Math.PI/4 : Math.PI/4);
                        this.canSnapTurn = false;
                    } else if (Math.abs(axes[2]) < 0.1) {
                        this.canSnapTurn = true;
                    }
                }
            }

            // --- HAND TRACKING MOVEMENT (Pinch) ---
            if (source.hand) {
                const index = source.hand.get(8); // Index Tip
                const thumb = source.hand.get(4); // Thumb Tip
                if (index && thumb && index.position.distanceTo(thumb.position) < 0.02) {
                    const dir = new THREE.Vector3();
                    this.camera.getWorldDirection(dir);
                    dir.y = 0; dir.normalize();
                    this.attemptMove(dir.x * 0.05, dir.z * 0.05);
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    },

    attemptMove(dx, dz) {
        // Collision Audit: Check if the new position hits a wall/table
        const nextPos = this.playerGroup.position.clone();
        nextPos.x += dx;
        nextPos.z += dz;

        // Player bounding sphere (0.5m radius)
        const playerSphere = new THREE.Sphere(nextPos, 0.5);
        
        let collision = false;
        for (const box of World.colliders) {
            if (box.intersectsSphere(playerSphere)) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            this.playerGroup.position.copy(nextPos);
        }
    }
};

Core.init();
