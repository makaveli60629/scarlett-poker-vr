import * as THREE from 'three';
import { scene, renderer, colliders } from './world.js';
import { autoSit } from './poker.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
export const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);
playerRig.position.set(0, 0, 5); // Spawn

const factory = new XRControllerModelFactory();

[0, 1].forEach(id => {
    const c = renderer.xr.getController(id);
    const g = renderer.xr.getControllerGrip(id);
    g.add(factory.createControllerModel(g));
    
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-2)]), new THREE.LineBasicMaterial({color: 0x00f2ff}));
    c.add(line);
    playerRig.add(c, g);
});

function loop() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad && source.handedness === 'left') {
                const axes = source.gamepad.axes;
                const dir = new THREE.Vector3(axes[2], 0, axes[3]).applyQuaternion(camera.quaternion);
                dir.y = 0;
                const next = playerRig.position.clone().addScaledVector(dir, 0.1);
                
                // Solid Wall Physics
                const pBox = new THREE.Box3().setFromCenterAndSize(next, new THREE.Vector3(0.5, 2, 0.5));
                const hit = colliders.some(c => c.intersectsBox(pBox));
                if (!hit) playerRig.position.copy(next);
            }
        }
        autoSit(playerRig);
    }
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(loop);
