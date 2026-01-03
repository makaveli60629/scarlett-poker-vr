import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export const Controls = {
    hands: [],
    laser: new THREE.Line(),
    watchMenu: new THREE.Mesh(),

    init(renderer, scene, playerGroup, camera) {
        const factory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = renderer.xr.getHand(i);
            const model = factory.createHandModel(hand, 'mesh');
            hand.add(model);
            playerGroup.add(hand);
            this.hands.push({ hand, model });
        }

        // OBJECT 2: THE WRIST WATCH (Attached to left hand)
        this.watchMenu = new THREE.Mesh(
            new THREE.PlaneGeometry(0.1, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        );
        this.watchMenu.visible = false;
        this.hands[0].hand.add(this.watchMenu); // Left Hand
        this.watchMenu.position.set(0, 0.05, 0);
        this.watchMenu.rotation.x = -Math.PI / 2;

        // Laser for Teleport
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
        this.laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
        this.laser.visible = false;
        scene.add(this.laser);
    },

    update(renderer, camera, playerGroup) {
        this.hands.forEach((h, i) => {
            const indexTip = h.hand.get(8);
            const thumbTip = h.hand.get(4);
            const wrist = h.hand.get(0);

            if (indexTip && thumbTip) {
                const dist = indexTip.position.distanceTo(thumbTip.position);
                if (dist < 0.02) {
                    this.laser.visible = true;
                    this.laser.position.copy(indexTip.position);
                    // Add teleport jump logic here
                } else {
                    this.laser.visible = false;
                }
            }

            // Wrist Flip for Watch Menu
            if (i === 0 && wrist) { // Left hand watch
                const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(wrist.quaternion);
                this.watchMenu.visible = normal.y > 0.5; // Only show if wrist is flipped up
            }
        });
    }
};
