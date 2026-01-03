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
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        this.playerGroup.position.set(0, 1.6, 0);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.createAvatar();
        this.setupHands();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    createAvatar() {
        // Simple Avatar so you are visible in the Mirror
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.2), new THREE.MeshStandardMaterial({color: 0x333333}));
        torso.position.y = -0.4;
        
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshStandardMaterial({color: 0xffdbac}));
        head.position.y = 0;

        this.avatar.add(torso, head);
        this.camera.add(this.avatar); // Avatar follows your head/camera
    },

    setupHands() {
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    },

    update() {
        // Sync avatar rotation with camera but keep it upright
        this.avatar.rotation.y = this.camera.rotation.y;
        
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    this.playerGroup.position.x += (axes[2] || 0) * 0.1;
                    this.playerGroup.position.z += (axes[3] || 0) * 0.1;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
