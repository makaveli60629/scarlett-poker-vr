import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export const Controls = {
    hands: [],
    laser: null,
    watchMenu: null,

    init(renderer, scene, playerGroup) {
        const factory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = renderer.xr.getHand(i);
            hand.add(factory.createHandModel(hand, 'mesh'));
            playerGroup.add(hand);
            this.hands.push(hand);
        }

        // Wrist Watch Menu (Left Hand)
        this.watchMenu = new THREE.Mesh(
            new THREE.PlaneGeometry(0.1, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        );
        this.watchMenu.visible = false;
        this.hands[0].add(this.watchMenu);
        this.watchMenu.position.set(0, 0.05, 0);
        this.watchMenu.rotation.x = -Math.PI / 2;

        // Teleport Laser
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
        this.laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        this.laser.visible = false;
        scene.add(this.laser);
    },

    update(renderer, camera, playerGroup) {
        this.hands.forEach((hand, i) => {
            const indexTip = hand.get(8);
            const thumbTip = hand.get(4);
            const wrist = hand.get(0);

            if (indexTip && thumbTip) {
                const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.02;
                if (isPinching) {
                    this.laser.visible = true;
                    this.laser.position.copy(indexTip.position);
                } else {
                    this.laser.visible = false;
                }
            }
            
            if (i === 0 && wrist) { // Watch Check
                const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(wrist.quaternion);
                this.watchMenu.visible = normal.y > 0.6;
            }
        });
    }
};
