import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export const Controls = {
    controllers: [],
    hands: [],
    teleportLaser: null,
    teleportTarget: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),

    init(renderer, scene, playerGroup) {

        this.scene = scene;
        this.playerGroup = playerGroup;

        renderer.xr.enabled = true;

        /* ======================
           CONTROLLERS SETUP
        ======================= */
        for (let i = 0; i < 2; i++) {
            const controller = renderer.xr.getController(i);
            controller.userData.index = i;
            controller.addEventListener('selectstart', (e) => this.onSelectStart(e));
            controller.addEventListener('selectend', (e) => this.onSelectEnd(e));
            scene.add(controller);
            this.controllers.push(controller);

            // Controller Model
            const factory = new XRControllerModelFactory();
            const grip = renderer.xr.getControllerGrip(i);
            grip.add(factory.createControllerModel(grip));
            scene.add(grip);
        }

        /* ======================
           HANDS SETUP
        ======================= */
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            scene.add(hand);
            this.hands.push(hand);

            // Color the hand mesh
            hand.traverse((child) => {
                if (child.isMesh) child.material.color.set(i === 0 ? 0xffd1b3 : 0xffd1b3);
            });
        }

        /* ======================
           TELEPORT LASER
        ======================= */
        const laserGeom = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
        const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.teleportLaser = new THREE.Mesh(laserGeom, laserMat);
        this.teleportLaser.rotation.x = -Math.PI / 2;
        this.teleportLaser.visible = false;
        scene.add(this.teleportLaser);

        this.tempMatrix = new THREE.Matrix4();
    },

    update(renderer, camera, playerGroup) {
        // For each hand/controller, cast a ray for teleport
        for (let i = 0; i < this.controllers.length; i++) {
            const controller = this.controllers[i];

            // Pinch / trigger pressed
            const session = renderer.xr.getSession();
            if (!session) return;

            const inputSource = session.inputSources[i];
            if (inputSource && inputSource.gamepad) {
                const buttons = inputSource.gamepad.buttons;
                const pressed = buttons[0].pressed;

                if (pressed) {
                    this.showTeleportLaser(controller);
                } else {
                    if (this.teleportLaser.visible) this.teleportPlayer();
                    this.teleportLaser.visible = false;
                }
            }
        }
    },

    showTeleportLaser(controller) {
        // Position laser from hand forward
        controller.updateMatrixWorld();
        const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(controller.matrixWorld).sub(controller.position).normalize();
        this.raycaster.set(controller.position, dir);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.teleportTarget.copy(point);
            this.teleportLaser.position.copy(controller.position).lerp(point, 0.5);
            const distance = controller.position.distanceTo(point);
            this.teleportLaser.scale.set(1, distance, 1);
            this.teleportLaser.lookAt(point);
            this.teleportLaser.visible = true;
        }
    },

    teleportPlayer() {
        this.playerGroup.position.set(this.teleportTarget.x, 1.6, this.teleportTarget.z);
        this.teleportLaser.visible = false;
    },

    onSelectStart(event) {
        // Pinch/trigger start
        // Placeholder for future grab logic
    },

    onSelectEnd(event) {
        // Pinch/trigger release
        // Placeholder for future release logic
    }
};
