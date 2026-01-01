import * as THREE from 'three';

export class PhysicsEngine {
    constructor() {
        this.colliders = [];
        this.zones = [];
    }

    addCollider(mesh) {
        mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }

    addZone(name, mesh, callback) {
        const box = new THREE.Box3().setFromObject(mesh);
        this.zones.push({ name, box, callback, active: false });
    }

    checkCollision(pos, radius = 0.4) {
        const playerSphere = new THREE.Sphere(pos, radius);
        for (let zone of this.zones) {
            if (zone.box.intersectsSphere(playerSphere)) {
                if (!zone.active) { zone.active = true; zone.callback(); }
            } else { zone.active = false; }
        }
        for (let wall of this.colliders) {
            if (wall.intersectsSphere(playerSphere)) return true;
        }
        return false;
    }
}
