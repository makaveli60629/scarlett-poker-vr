import * as THREE from 'three';

export function setupControllers(renderer, scene) {
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    
    scene.add(controller1);
    scene.add(controller2);

    // Cyan Laser Pointers for selection
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), 
        new THREE.Vector3(0, 0, -5)
    ]);
    const line = new THREE.Line(laserGeo, laserMat);
    
    controller1.add(line.clone());
    controller2.add(line.clone());

    return { controller1, controller2 };
}

export function handleMovement(renderer, camera, controls) {
    const session = renderer.xr.getSession();
    if (!session) return;

    // Movement speed
    const speed = 0.15;

    for (const source of session.inputSources) {
        if (source.gamepad) {
            const axes = source.gamepad.axes;
            
            // Oculus Thumbstick Mapping: 
            // axes[2] = Horizontal (Left/Right)
            // axes[3] = Vertical (Forward/Backward)

            // Forward/Backward Movement
            if (Math.abs(axes[3]) > 0.1) {
                camera.position.z += axes[3] * speed;
            }
            // Side-to-Side Strafing
            if (Math.abs(axes[2]) > 0.1) {
                camera.position.x += axes[2] * speed;
            }
        }
    }
}
