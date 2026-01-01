import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class PokerWorld162 {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x101015); // Dark grey-blue sky
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // CAMERA RIG (Important for Movement)
        this.cameraRig = new THREE.Group();
        this.scene.add(this.cameraRig);
        this.cameraRig.add(this.camera);

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // --- FULL ROOM LIGHTING ---
        const ambient = new THREE.AmbientLight(0xffffff, 0.8); 
        this.scene.add(ambient);

        const ceilingLight = new THREE.PointLight(0xffffff, 20, 50);
        ceilingLight.position.set(0, 8, -4);
        this.scene.add(ceilingLight);

        this.buildRoom();
        this.setupOculus();

        // Safety Spawn: Start at height 1.6, looking forward
        this.cameraRig.position.set(0, 0, 2); 
        this.camera.position.y = 1.6;

        this.renderer.setAnimationLoop(() => this.update());
    }

    buildRoom() {
        const loader = new THREE.TextureLoader();
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ map: loader.load('../Checker floor.jpg') })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Ceiling
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), wallMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 10;
        this.scene.add(ceiling);

        // 4 Walls (Front, Back, Left, Right)
        const wallG = new THREE.PlaneGeometry(20, 10);
        const frontWall = new THREE.Mesh(wallG, wallMat);
        frontWall.position.set(0, 5, -10);
        this.scene.add(frontWall);

        const backWall = new THREE.Mesh(wallG, wallMat);
        backWall.position.set(0, 5, 10);
        backWall.rotation.y = Math.PI;
        this.scene.add(backWall);

        // Poker Table
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.2, 64),
            new THREE.MeshStandardMaterial({ map: loader.load('../poker_felt_scarlett.jpg') })
        );
        table.position.set(0, 0.9, -4);
        this.scene.add(table);
    }

    setupOculus() {
        this.controller1 = this.renderer.xr.getController(0); // Left (Move)
        this.controller2 = this.renderer.xr.getController(1); // Right (Turn)
        this.cameraRig.add(this.controller1, this.controller2);

        const factory = new XRControllerModelFactory();
        this.controller1.add(factory.createControllerModel(this.controller1));
        this.controller2.add(factory.createControllerModel(this.controller2));
        
        this.lastTurn = 0;
    }

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes; // [x, y, x, y]
                    
                    // 1. Walk (Left Stick)
                    if (source.handedness === 'left') {
                        this.cameraRig.position.x += axes[2] * 0.05;
                        this.cameraRig.position.z += axes[3] * 0.05;
                    }
                    
                    // 2. Snap Turn (Right Stick)
                    if (source.handedness === 'right') {
                        if (Math.abs(axes[2]) > 0.8 && Date.now() - this.lastTurn > 500) {
                            this.cameraRig.rotation.y -= Math.sign(axes[2]) * (Math.PI / 4);
                            this.lastTurn = Date.now();
                        }
                    }
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
}

new PokerWorld162();
