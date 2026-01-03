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
            const model = factory.createHandModel(hand, 'mesh');
            hand.add(model);
            playerGroup.add(hand);
            this.hands.push(hand);
        }

        // WATCH MENU (Attached to Left Hand)
        this.watchMenu = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        );
        this.watchMenu.visible = false;
        this.hands[0].add(this.watchMenu);
        this.watchMenu.position.set(0, 0.05, 0.02);
        this.watchMenu.rotation.x = -Math.PI / 2;

        // TELEPORT LASER
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
        this.laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
        this.laser.visible = false;
        scene.add(this.laser);
    },

    update(renderer, camera, playerGroup) {
        const session = renderer.xr.getSession();
        if (!session) return;

        this.hands.forEach((hand, i) => {
            const indexTip = hand.get(8);
            const thumbTip = hand.get(4);
            const wrist = hand.get(0);

            // PINCH LOGIC
            if (indexTip && thumbTip) {
                const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.02;
                if (isPinching) {
                    this.laser.visible = true;
                    this.laser.position.copy(indexTip.position);
                    // Add jump code here
                } else {
                    this.laser.visible = false;
                }
            }
            
            // WRIST WATCH FLIP
            if (i === 0 && wrist) {
                const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(wrist.quaternion);
                this.watchMenu.visible = normal.y > 0.5;
            }
        });
    }
};
