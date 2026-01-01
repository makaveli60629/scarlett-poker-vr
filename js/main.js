import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class PokerFidelity16 {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010103);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        this.userGroup = new THREE.Group();
        this.scene.add(this.userGroup);
        this.userGroup.add(this.camera);

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // --- 1000x LIGHTING UPDATE ---
        this.scene.add(new THREE.AmbientLight(0x404040, 2)); // High fill light
        const spot = new THREE.SpotLight(0xffffff, 10);
        spot.position.set(0, 5, -4);
        spot.castShadow = true;
        this.scene.add(spot);

        this.setupEnvironment();
        this.setupOculusHaptics();
        this.renderer.setAnimationLoop(() => this.update());
    }

    setupEnvironment() {
        const loader = new THREE.TextureLoader();
        
        // Floor (Checker)
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ map: loader.load('../Checker floor.jpg') })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Poker Table (Felt)
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.2, 64),
            new THREE.MeshStandardMaterial({ map: loader.load('../poker_felt_scarlett.jpg') })
        );
        table.position.set(0, 0.9, -4);
        this.scene.add(table);

        this.userGroup.position.set(0, 0, 1.5); // Move player out of table
    }

    setupOculusHaptics() {
        this.controller1 = this.renderer.xr.getController(0); // Left
        this.controller2 = this.renderer.xr.getController(1); // Right
        this.userGroup.add(this.controller1, this.controller2);

        const factory = new XRControllerModelFactory();
        this.controller1.add(factory.createControllerModel(this.controller1));
        this.controller2.add(factory.createControllerModel(this.controller2));

        // Haptic pulse on Trigger
        this.controller2.addEventListener('selectstart', (e) => this.vibrate(e, 0.8, 100));
        this.controller1.addEventListener('selectstart', (e) => this.vibrate(e, 0.3, 50));
    }

    vibrate(event, intensity, duration) {
        const session = this.renderer.xr.getSession();
        if (session) {
            const inputSource = session.inputSources[event.target === this.controller1 ? 0 : 1];
            if (inputSource && inputSource.gamepad && inputSource.gamepad.hapticActuators) {
                inputSource.gamepad.hapticActuators[0].pulse(intensity, duration);
            }
        }
        console.log("Haptic Pulse Triggered");
    }

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            // Smooth Locomotion (Left Stick)
            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    this.userGroup.position.x += axes[2] * 0.05;
                    this.userGroup.position.z += axes[3] * 0.05;
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
}

new PokerFidelity16();
