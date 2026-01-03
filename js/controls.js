import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export const Controls = {

    leftController: null,
    rightController: null,
    leftHand: null,
    rightHand: null,
    laser: null,
    teleportMarker: null,
    raycaster: new THREE.Raycaster(),
    tempMatrix: new THREE.Matrix4(),

    init(renderer, scene, playerGroup) {

        // ======================
        // CONTROLLERS
        // ======================
        this.leftController = renderer.xr.getController(0);
        this.rightController = renderer.xr.getController(1);
        scene.add(this.leftController);
        scene.add(this.rightController);

        // XR Controller Models
        const controllerFactory = new XRControllerModelFactory();

        const leftGrip = renderer.xr.getControllerGrip(0);
        leftGrip.add(controllerFactory.createControllerModel(leftGrip));
        scene.add(leftGrip);

        const rightGrip = renderer.xr.getControllerGrip(1);
        rightGrip.add(controllerFactory.createControllerModel(rightGrip));
        scene.add(rightGrip);

        // ======================
        // HANDS
        // ======================
        const handFactory = new XRHandModelFactory();
        this.leftHand = renderer.xr.getHand(0);
        this.leftHand.add(handFactory.createHandModel(this.leftHand, 'mesh'));
        scene.add(this.leftHand);

        this.rightHand = renderer.xr.getHand(1);
        this.rightHand.add(handFactory.createHandModel(this.rightHand, 'mesh'));
        scene.add(this.rightHand);

        // Add basic skin tone coloring
        this.leftHand.traverse((c) => { if (c.isMesh) c.material.color.set(0xffd1b5); });
        this.rightHand.traverse((c) => { if (c.isMesh) c.material.color.set(0xffd1b5); });

        // ======================
        // LASER POINTER
        // ======================
        const laserGeom = new THREE.CylinderGeometry(0.01, 0.01, 5, 8);
        const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
        this.laser = new THREE.Mesh(laserGeom, laserMat);
        this.laser.rotation.x = -Math.PI / 2;
        scene.add(this.laser);
        this.laser.visible = false;

        // ======================
        // TELEPORT MARKER
        // ======================
        this.teleportMarker = new THREE.Mesh(
            new THREE.CircleGeometry(0.4, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffff, opacity: 0.5, transparent: true })
        );
        this.teleportMarker.rotation.x = -Math.PI / 2;
        this.teleportMarker.visible = false;
        scene.add(this.teleportMarker);

        // ======================
        // EVENT LISTENERS
        // ======================
        this.leftController.addEventListener('selectstart', () => this.onSelectStart(playerGroup));
        this.leftController.addEventListener('selectend', () => this.onSelectEnd(playerGroup));
    },

    update(renderer, camera, playerGroup) {

        // Laser always points forward from right hand
        const rightPos = new THREE.Vector3();
        const rightDir = new THREE.Vector3(0, 0, -1);
        this.rightHand.getWorldPosition(rightPos);
        this.rightHand.getWorldDirection(rightDir);

        // Cast ray to floor
        this.raycaster.set(rightPos, rightDir);
        const intersects = this.raycaster.intersectObjects(renderer.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.laser.visible = true;
            this.laser.position.copy(rightPos.clone().lerp(point, 0.5));
            const distance = rightPos.distanceTo(point);
            this.laser.scale.set(1, distance / 2.5, 1);

            // Show teleport marker
            this.teleportMarker.position.set(point.x, 0.01, point.z);
            this.teleportMarker.visible = true;
        } else {
            this.laser.visible = false;
            this.teleportMarker.visible = false;
        }
    },

    onSelectStart(playerGroup) {
        // Teleport if marker is visible
        if (this.teleportMarker.visible) {
            playerGroup.position.set(
                this.teleportMarker.position.x,
                playerGroup.position.y,
                this.teleportMarker.position.z
            );
        }
    },

    onSelectEnd(playerGroup) {
        // Could add smooth transition later
    }
};
