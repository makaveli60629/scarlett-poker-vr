import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

class ScarlettPoker164 {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // --- THE PLAYER RIG ---
        this.userGroup = new THREE.Group();
        this.scene.add(this.userGroup);
        this.userGroup.add(this.camera);
        
        this.lastTurnTime = 0;
        this.balance = 5000;
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer, { 'optionalFeatures': ['hand-tracking'] }));

        // --- LEVEL 10 LIGHTING (High Visibility) ---
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.0));
        const tableLight = new THREE.PointLight(0x00ffcc, 5, 20);
        tableLight.position.set(0, 3, 0);
        this.scene.add(tableLight);

        this.buildWorld();
        this.setupInput();

        // --- START POSITION (Safety Spawn) ---
        this.userGroup.position.set(0, 0, 4); // 4 meters away from table
        this.camera.position.y = 1.6; // Eye level

        this.renderer.setAnimationLoop(() => this.render());
    }

    buildWorld() {
        const loader = new THREE.TextureLoader();
        
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshLambertMaterial({ color: 0x555555 })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);
        loader.load('../Checker floor.jpg', (t) => { floor.material.map = t; floor.material.needsUpdate = true; });

        // Poker Table (Centered at 0,0,0)
        this.table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.4, 64),
            new THREE.MeshLambertMaterial({ color: 0x662211 })
        );
        this.table.position.y = 0.9;
        this.scene.add(this.table);
        loader.load('../poker_felt_scarlett.jpg', (t) => { this.table.material.map = t; this.table.material.needsUpdate = true; });

        // 4 BRICK WALLS (As requested)
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x331111 });
        const wallG = new THREE.PlaneGeometry(40, 15);
        const fWall = new THREE.Mesh(wallG, wallMat); fWall.position.set(0, 7.5, -10); this.scene.add(fWall);
        const bWall = new THREE.Mesh(wallG, wallMat); bWall.position.set(0, 7.5, 10); bWall.rotation.y = Math.PI; this.scene.add(bWall);
    }

    setupInput() {
        const controllerModelFactory = new XRControllerModelFactory();
        const handModelFactory = new XRHandModelFactory();

        // --- LEFT HAND / WRIST WATCH ---
        this.con1 = this.renderer.xr.getController(0);
        this.userGroup.add(this.con1);
        
        // Wrist Watch Hologram
        const watchGeo = new THREE.PlaneGeometry(0.15, 0.08);
        const watchMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.watchUI = new THREE.Mesh(watchGeo, watchMat);
        this.watchUI.position.set(0, 0.05, 0.1); // Positioned on top of wrist
        this.watchUI.rotation.x = -Math.PI / 2;
        this.con1.add(this.watchUI);

        // Text for watch (Simulated)
        // Note: For actual text we would use a CanvasTexture later, currently just a glowing panel.

        // Right Hand
        this.con2 = this.renderer.xr.getController(1);
        this.userGroup.add(this.con2);

        // Add Models
        const grip1 = this.renderer.xr.getControllerGrip(0);
        grip1.add(controllerModelFactory.createControllerModel(grip1));
        this.userGroup.add(grip1);

        const grip2 = this.renderer.xr.getControllerGrip(1);
        grip2.add(controllerModelFactory.createControllerModel(grip2));
        this.userGroup.add(grip2);
        
        // Hand Tracking
        this.hand1 = this.renderer.xr.getHand(0);
        this.hand1.add(handModelFactory.createHandModel(this.hand1));
        this.userGroup.add(this.hand1);

        this.hand2 = this.renderer.xr.getHand(1);
        this.hand2.add(handModelFactory.createHandModel(this.hand2));
        this.userGroup.add(this.hand2);
    }

    handleOculusInput() {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            if (!source.gamepad) continue;
            const axes = source.gamepad.axes;
            const buttons = source.gamepad.buttons;

            // 1. LEFT STICK: Walk
            if (source.handedness === 'left') {
                this.userGroup.position.x += axes[2] * 0.05;
                this.userGroup.position.z += axes[3] * 0.05;
                
                // LEFT MENU BUTTON (Button 4/5 usually)
                if (buttons[4].pressed || buttons[5].pressed) {
                    console.log("Menu Pressed - Exit Lobby Sequence");
                    this.vibrate(0.5, 100, 0);
                }
            }

            // 2. RIGHT STICK: Snap Turn
            if (source.handedness === 'right') {
                if (Math.abs(axes[2]) > 0.8 && Date.now() - this.lastTurnTime > 500) {
                    this.userGroup.rotation.y -= Math.sign(axes[2]) * (Math.PI / 4);
                    this.lastTurnTime = Date.now();
                }
            }
        }
    }

    vibrate(intensity, duration, handIndex) {
        const session = this.renderer.xr.getSession();
        if (session && session.inputSources[handIndex]?.gamepad?.hapticActuators) {
            session.inputSources[handIndex].gamepad.hapticActuators[0].pulse(intensity, duration);
        }
    }

    render() {
        this.handleOculusInput();
        this.renderer.render(this.scene, this.camera);
    }
}

new ScarlettPoker164();
