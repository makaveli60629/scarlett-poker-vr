import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class FullInstall161 {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205); // Dark blue-black
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        // MOVEMENT GROUP: Attach camera and controllers here
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

        // --- LEVEL 10 LIGHTING ---
        const ambient = new THREE.AmbientLight(0xffffff, 1.2); 
        this.scene.add(ambient);

        const pointLight = new THREE.PointLight(0xffd700, 10, 15);
        pointLight.position.set(0, 3, -5);
        this.scene.add(pointLight);

        this.setupEnvironment();
        this.setupOculus();

        // Fix Spawn: Stand at 0, 1.6 height, and 0 depth
        this.userGroup.position.set(0, 0, 0); 
        this.camera.position.set(0, 1.6, 0); 

        this.renderer.setAnimationLoop(() => this.update());
    }

    setupEnvironment() {
        const loader = new THREE.TextureLoader();
        
        // Floor (Checker floor.jpg)
        const floorTex = loader.load('../Checker floor.jpg');
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(15, 15);
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ map: floorTex })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Table (poker_felt_scarlett.jpg)
        const feltTex = loader.load('../poker_felt_scarlett.jpg');
        this.table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.2, 64),
            new THREE.MeshStandardMaterial({ map: feltTex })
        );
        this.table.position.set(0, 0.9, -5); // Table is in front of you
        this.scene.add(this.table);
    }

    setupOculus() {
        this.controller1 = this.renderer.xr.getController(0); // Left
        this.controller2 = this.renderer.xr.getController(1); // Right
        this.userGroup.add(this.controller1, this.controller2);

        const factory = new XRControllerModelFactory();
        this.controller1.add(factory.createControllerModel(this.controller1));
        this.controller2.add(factory.createControllerModel(this.controller2));

        // Haptic Feedback for Trigger
        this.controller2.addEventListener('selectstart', () => this.vibrate(0.8, 100));
    }

    vibrate(intensity, duration) {
        const session = this.renderer.xr.getSession();
        if (session) {
            const inputSource = session.inputSources[1]; // Right Hand
            if (inputSource?.gamepad?.hapticActuators) {
                inputSource.gamepad.hapticActuators[0].pulse(intensity, duration);
            }
        }
    }

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            // LEFT STICK MOVEMENT
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

new FullInstall161();
