import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

export const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }),
    playerGroup: new THREE.Group(),
    userData: { money: 2500, rank: "Gold" }, // Stats for Watch HUD

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Spawn Fix (1.6m Height)
        this.playerGroup.position.set(0, 1.6, 0);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

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

            // Attach Watch HUD to Left Hand
            if (i === 0) { this.attachWatch(hand); }
        }
    },

    attachWatch(hand) {
        const watchGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06);
        const watchMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const watch = new THREE.Mesh(watchGeo, watchMat);
        
        // Canvas-based Screen for Real-time Stats
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256; canvas.height = 128;
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,128);
        ctx.fillStyle = '#00f2ff'; ctx.font = 'bold 30px Arial';
        ctx.fillText(`$${this.userData.money}`, 10, 50);
        ctx.fillText(`RANK: ${this.userData.rank}`, 10, 100);

        const screenGeo = new THREE.PlaneGeometry(0.07, 0.05);
        const screenMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.y = 0.011;
        screen.rotation.x = -Math.PI / 2;
        
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
                    const buttons = source.gamepad.buttons;

                    // LEFT HAND CONTROLS
                    if (source.handedness === 'left') {
                        // Smooth Movement
                        this.playerGroup.position.x += (axes[2] || 0) * 0.08;
                        this.playerGroup.position.z += (axes[3] || 0) * 0.08;

                        // X Button (Button 4) - Open Store
                        if (buttons[4] && buttons[4].pressed) {
                            console.log("Store Menu Opened");
                        }
                        // Y Button (Button 5) - Toggle HUD
                        if (buttons[5] && buttons[5].pressed) {
                            console.log("HUD Toggled");
                        }
                    }

                    // RIGHT HAND CONTROLS
                    if (source.handedness === 'right') {
                        // A Button (Button 0) - Check/Call
                        if (buttons[0] && buttons[0].pressed) {
                            console.log("Action: Check/Call");
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
