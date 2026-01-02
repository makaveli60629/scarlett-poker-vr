import * as THREE from 'three';

export function setupControllers(renderer, scene) {
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    
    scene.add(controller1);
    scene.add(controller2);

    const laser = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]),
        new THREE.LineBasicMaterial({ color: 0x00ffff })
    );
    controller1.add(laser.clone());
    controller2.add(laser.clone());

    return { controller1, controller2 };
}

export function handleMovement(renderer, camera, controls) {
    const session = renderer.xr.getSession();
    if (!session) return;

    // Iterate through input sources (Oculus Touch)
    for (const source of session.inputSources) {
        if (source.gamepad) {
            const axes = source.gamepad.axes;
            // Thumbstick Forward/Backward (Axis 3 on Oculus)
            if (Math.abs(axes[3]) > 0.1) {
                camera.position.z += axes[3] * 0.2;
            }
            // Thumbstick Left/Right (Axis 2 on Oculus)
            if (Math.abs(axes[2]) > 0.1) {
                camera.position.x += axes[2] * 0.2;
            }
        }
    }
}
