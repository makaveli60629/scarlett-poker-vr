import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", xrCompatible: true }),
    playerGroup: new THREE.Group(),
    teleportMarker: new THREE.Mesh(new THREE.RingGeometry(0.4, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0xa020f0, side: THREE.DoubleSide })),
    chips: 5000,
    rank: "Diamond",

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.0;
        document.body.appendChild(this.renderer.domElement);

        // Standard 1.6m eye-level spawn in Lobby
        this.playerGroup.position.set(0, 1.6, 0);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

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
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
            if (i === 0) this.createWatch(hand); // Left Hand Watch
        }
    },

    createWatch(hand) {
        const watch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256; canvas.height = 128;
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,128);
        ctx.fillStyle = '#00f2ff'; ctx.font = 'bold 32px sans-serif';
        ctx.fillText(`$${this.chips}`, 20, 50);
        ctx.fillText(`${this.rank}`, 20, 100);

        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
        screen.position.y = 0.011; screen.rotation.x = -Math.PI/2;
        watch.add(screen);
        watch.position.set(0, 0.03, 0.05);
        hand.add(watch);
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes;
                    const btns = source.gamepad.buttons;

                    // LEFT HAND: Walk + Menu
                    if (source.handedness === 'left') {
                        this.playerGroup.position.x += (axes[2] || 0) * 0.1;
                        this.playerGroup.position.z += (axes[3] || 0) * 0.1;
                        if (btns[4]?.pressed) this.toggleMenu(); // X Button
                    }

                    // RIGHT HAND: Teleport + Call
                    if (source.handedness === 'right') {
                        if (axes[3] < -0.5) this.aimTeleport();
                        else if (this.teleportMarker.visible) this.teleport();
                        if (btns[0]?.pressed) console.log("Player Called/Checked"); // A Button
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    },

    aimTeleport() {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.teleportMarker.position.copy(this.playerGroup.position).addScaledVector(dir, 8);
        this.teleportMarker.position.y = 0.01;
        this.teleportMarker.visible = true;
    },

    teleport() {
        this.playerGroup.position.set(this.teleportMarker.position.x, 1.6, this.teleportMarker.position.z);
        this.teleportMarker.visible = false;
    },

    toggleMenu() {
        console.log("Menu Toggled");
        // Logic for menu overlay goes here
    }
};

Core.init();
