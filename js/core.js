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
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();
        
        // Permanent Rig Height
        this.playerRig = new THREE.Group();
        this.playerRig.add(this.camera);
        this.scene.add(this.playerRig);
        this.playerRig.position.set(0, 1.6, 0); 

        this.setupControllers();
        this.ui = new WorldUI(this.scene);
        this.poker = new PokerEngine(this.scene, this.texLoader);
        this.buildWorld();
    }

    setupControllers() {
        const factory = new XRControllerModelFactory();
        [0, 1].forEach(id => {
            const controller = this.renderer.xr.getController(id);
            this.playerRig.add(controller);
            
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]));
            line.name = 'ray';
            line.scale.z = 0; // Hidden until trigger pressed
            controller.add(line);

            const grip = this.renderer.xr.getControllerGrip(id);
            grip.add(factory.createControllerModel(grip));
            this.playerRig.add(grip);

            controller.addEventListener('selectstart', () => { 
                controller.userData.isSelecting = true;
                line.scale.z = 10; 
            });
            controller.addEventListener('selectend', () => {
                controller.userData.isSelecting = false;
                line.scale.z = 0;
                if (this.teleportTarget) {
                    this.playerRig.position.set(this.teleportTarget.x, 1.6, this.teleportTarget.z);
                }
            });
        });
    }

    buildWorld() {
        // Floor setup with your folder path
        const floorTex = this.texLoader.load('assets/textures/floor.jpg');
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(10, 10);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ map: floorTex, color: 0x555555 }));
        floor.rotation.x = -Math.PI / 2;
        floor.name = "Floor";
        this.scene.add(floor);

        // Lighting
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(5, 10, 5);
        this.scene.add(sun);
    }

    update() {
        this.teleportTarget = null;
        [0, 1].forEach(id => {
            const controller = this.renderer.xr.getController(id);
            if (controller.userData.isSelecting) {
                this.tempMatrix.identity().extractRotation(controller.matrixWorld);
                this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
                const intersects = this.raycaster.intersectObjects(this.scene.children);
                const hit = intersects.find(i => i.object.name === "Floor");
                if (hit) this.teleportTarget = hit.point;
            }
        });
        this.poker.update(this.camera.position);
    }
}
