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
    watchScreen: null,
    canSnapTurn: true,

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { optionalFeatures: ['local-floor', 'hand-tracking'] }));
        
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);
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
            if (i === 0) this.attachWatch(hand); // Watch on Left Hand
            this.playerGroup.add(hand);
        }
    },

    attachWatch(hand) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        this.watchScreen = canvas;
        const watchGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06);
        const watch = new THREE.Mesh(watchGeo, new THREE.MeshPhongMaterial({ color: 0x222222 }));
        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        screenMesh.position.y = 0.011; screenMesh.rotation.x = -Math.PI/2;
        watch.add(screenMesh);
        watch.position.set(0, 0.03, 0.05);
        hand.add(watch);
        this.updateWatch("Lobby");
    },

    updateWatch(roomName) {
        const ctx = this.watchScreen.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,128);
        ctx.fillStyle = '#00f2ff'; ctx.font = 'bold 30px Arial';
        ctx.fillText(roomName, 20, 50);
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial';
        ctx.fillText(`Chips: ${Logic.stats.chips}`, 20, 90);
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (!source.gamepad) continue;
                const axes = source.gamepad.axes;
                // Movement & Snap Turn
                if (source.handedness === 'left') {
                    this.playerGroup.position.x += axes[2] * 0.08;
                    this.playerGroup.position.z += axes[3] * 0.08;
                }
                if (source.handedness === 'right' && Math.abs(axes[2]) > 0.7 && this.canSnapTurn) {
                    this.playerGroup.rotation.y += (axes[2] > 0 ? -Math.PI/4 : Math.PI/4);
                    this.canSnapTurn = false;
                } else if (Math.abs(axes[2]) < 0.1) { this.canSnapTurn = true; }
            }
        }
        // Room Detection for Watch
        const px = this.playerGroup.position.x;
        const pz = this.playerGroup.position.z;
        let currentRoom = "Lobby";
        if (px > 20) currentRoom = "Poker Room";
        else if (px < -20) currentRoom = "Store";
        else if (pz > 20) currentRoom = "Vault";
        this.updateWatch(currentRoom);

        this.renderer.render(this.scene, this.camera);
    }
};
Core.init();
