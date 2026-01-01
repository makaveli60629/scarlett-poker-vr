import * as THREE from 'three';
import { createHand } from './avatar.js';

export function setupControls(engine, floors, poker) {
    const { scene, renderer, playerRig } = engine;
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();
    let intersectPoint = null;

    // Movement Marker & Beam
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 32), new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide}));
    marker.rotation.x = -Math.PI/2;
    scene.add(marker);

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2), new THREE.MeshBasicMaterial({color: 0x00f2ff, transparent: true, opacity: 0.4}));
    scene.add(beam);

    // Hands
    const leftHand = createHand(true);
    const rightHand = createHand(false);
    
    const controller0 = renderer.xr.getController(0); // Right
    const controller1 = renderer.xr.getController(1); // Left
    
    controller0.add(rightHand);
    controller1.add(leftHand);
    playerRig.add(controller0, controller1);

    controller0.addEventListener('selectstart', () => {
        if (intersectPoint) playerRig.position.set(intersectPoint.x, 0, intersectPoint.z);
    });

    return {
        update: () => {
            tempMatrix.identity().extractRotation(controller0.matrixWorld);
            raycaster.ray.origin.setFromMatrixPosition(controller0.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

            const hits = raycaster.intersectObjects(floors);
            if (hits.length > 0) {
                intersectPoint = hits[0].point;
                marker.position.copy(intersectPoint);
                beam.position.set(intersectPoint.x, 1, intersectPoint.z);
                marker.visible = beam.visible = true;
            } else {
                marker.visible = beam.visible = false;
            }
        }
    };
}
