import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export default class Controls {
    constructor(S) {
        this.S = S;
        this.handFactory = new XRHandModelFactory();
        this.raycaster = new THREE.Raycaster();
        this.setupInputs();
    }

    setupInputs() {
        const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
        const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });

        for (let i = 0; i < 2; i++) {
            // HANDS
            const hand = this.S.renderer.xr.getHand(i);
            hand.add(this.handFactory.createHandModel(hand, "mesh"));
            this.S.player.add(hand);

            // CONTROLLERS + LASERS
            const controller = this.S.renderer.xr.getController(i);
            const laser = new THREE.Line(laserGeo, laserMat);
            controller.add(laser);
            this.S.player.add(controller);
        }
    }

    update(dt) {
        // GRAVITY: Stick player to world.js floors
        const down = new THREE.Vector3(0, -1, 0);
        this.raycaster.set(this.S.player.position, down);
        
        // We look for 'ground' in the world module
        const hits = this.raycaster.intersectObjects(this.S.scene.children, true);
        const floor = hits.find(h => h.object.name === "ground");
        
        if (floor) {
            this.S.player.position.y = THREE.MathUtils.lerp(this.S.player.position.y, floor.point.y, 0.1);
        }
    }
}
