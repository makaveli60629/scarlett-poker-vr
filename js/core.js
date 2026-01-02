import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { WorldUI } from './ui.js';
import { PokerEngine } from './poker.js';

export class VRCore {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.texLoader = new THREE.TextureLoader();
        
        // Setup Player Rig
        this.playerRig = new THREE.Group();
        this.playerRig.add(this.camera);
        this.scene.add(this.playerRig);
        this.playerRig.position.y = 1.6;

        // Controllers
        this.controllerModelFactory = new XRControllerModelFactory();
        this.setupControllers();

        // Sub-Modules
        this.ui = new WorldUI(this.scene, this.playerRig);
        this.poker = new PokerEngine(this.scene, this.texLoader);

        this.buildWorld();
    }

    setupControllers() {
        [0, 1].forEach(id => {
            const controller = this.renderer.xr.getController(id);
            this.playerRig.add(controller);
            const grip = this.renderer.xr.getControllerGrip(id);
            grip.add(this.controllerModelFactory.createControllerModel(grip));
            this.playerRig.add(grip);

            controller.addEventListener('selectstart', () => { this.isTeleporting = true; this.activeController = controller; });
            controller.addEventListener('selectend', () => this.teleport());
        });
    }

    buildWorld() {
        // Floor Target for Teleport
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.name = "Floor";
        this.scene.add(floor);

        // Lighting
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
    }

    teleport() {
        this.isTeleporting = false;
        // Logic to move playerRig to raycast point goes here
    }

    update() {
        this.poker.checkPlayerDistance(this.camera.position);
    }
}
