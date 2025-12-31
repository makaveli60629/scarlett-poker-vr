import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

let canTurn = true;
let moveHighlight;

export function setupOculus(renderer, scene, userRig) {
    const controller0 = renderer.xr.getController(0); // Left
    const controller1 = renderer.xr.getController(1); // Right
    scene.add(controller0);
    scene.add(controller1);

    // Create the Movement Highlight Ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
    moveHighlight = new THREE.Mesh(ringGeo, ringMat);
    moveHighlight.rotation.x = -Math.PI / 2;
    moveHighlight.visible = false;
    scene.add(moveHighlight);
}

export function updateLocomotion(renderer, userRig) {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes; 

        // LEFT STICK - Walking (Axes 2 & 3 for Oculus Quest)
        if (source.handedness === 'left') {
            const speed = 0.05;
            const deadzone = 0.1;

            if (Math.abs(axes[2]) > deadzone || Math.abs(axes[3]) > deadzone) {
                // Move relative to where you are LOOKING
                const direction = new THREE.Vector3(axes[2], 0, axes[3]);
                direction.applyQuaternion(userRig.quaternion);
                
                userRig.position.x += direction.x * speed;
                userRig.position.z += direction.z * speed;

                // Show Highlight where you are
                moveHighlight.visible = true;
                moveHighlight.position.set(userRig.position.x, 0.05, userRig.position.z);
            } else {
                moveHighlight.visible = false;
            }
        }

        // RIGHT STICK - Snap Turn & Height
        if (source.handedness === 'right') {
            // Snap Turning
            if (canTurn && Math.abs(axes[2]) > 0.8) {
                userRig.rotation.y -= Math.sign(axes[2]) * (Math.PI / 4);
                canTurn = false;
                setTimeout(() => { canTurn = true; }, 300);
            }
            // Move Up/Down (Y-axis)
            if (Math.abs(axes[3]) > 0.5) {
                userRig.position.y -= axes[3] * 0.05;
            }
        }
    }
}
