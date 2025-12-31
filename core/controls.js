import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

let canTurn = true;

export function setupOculus(renderer, scene, userRig) {
    // Controller setup if needed for hand models later
}

export function updateLocomotion(renderer, userRig) {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes;

        if (source.handedness === 'left') {
            const direction = new THREE.Vector3(axes[2], 0, axes[3]);
            direction.applyQuaternion(userRig.quaternion);
            userRig.position.addScaledVector(direction, 0.08);
        }

        if (source.handedness === 'right' && canTurn && Math.abs(axes[2]) > 0.7) {
            userRig.rotation.y -= Math.sign(axes[2]) * (Math.PI / 4);
            canTurn = false;
            setTimeout(() => canTurn = true, 300);
        }
    }
}
