import * as THREE from 'three';

export function setupControllers(renderer, scene) {
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);

    // Oculus Trigger Action
    controller1.addEventListener('selectstart', () => {
        console.log("Left Trigger Pressed");
    });

    controller2.addEventListener('selectstart', () => {
        console.log("Right Trigger Pressed");
    });

    scene.add(controller1);
    scene.add(controller2);

    // Laser Pointer Visuals
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)]);
    const line = new THREE.Line(laserGeo, laserMat);
    
    controller1.add(line.clone());
    controller2.add(line.clone());

    return { controller1, controller2 };
}
