import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, xrCompatible: true }),
    playerGroup: new THREE.Group(),
    avatar: new THREE.Group(),

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.toneMappingExposure = 2.2;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Start in Lobby center
        this.playerGroup.position.set(0, 1.6, 0);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupAvatar();
        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupAvatar() {
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.2), new THREE.MeshStandardMaterial({color: 0x111111}));
        torso.position.y = -0.5;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshStandardMaterial({color: 0xffdbac}));
        this.avatar.add(torso, head);
        this.camera.add(this.avatar); // Avatar follows head for mirror
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(factory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    const nextPos = this.playerGroup.position.clone();
                    nextPos.x += (axes[2] || 0) * 0.15;
                    nextPos.z += (axes[3] || 0) * 0.15;

                    if (!this.isColliding(nextPos)) {
                        this.playerGroup.position.copy(nextPos);
                    } else {
                        // Vibrate controller on collision
                        if (source.gamepad.hapticActuators?.length > 0) {
                            source.gamepad.hapticActuators[0].pulse(0.5, 100);
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    },

    isColliding(pos) {
        const pSphere = new THREE.Sphere(pos, 0.6);
        return World.colliders.some(box => box.intersectsSphere(pSphere));
    }
};

Core.init();
