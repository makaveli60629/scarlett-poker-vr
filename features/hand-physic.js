import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function initHandPhysics(renderer, scene, userRig) {
    const handModel = new THREE.SphereGeometry(0.05, 16, 16);
    const handMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });

    const leftHand = new THREE.Mesh(handModel, handMat);
    const rightHand = new THREE.Mesh(handModel, handMat);

    scene.add(leftHand, rightHand);

    return { leftHand, rightHand };
}

export function updateHands(renderer, leftHand, rightHand) {
    const session = renderer.xr.getSession();
    if (!session) return;

    // This snaps the holographic spheres to your actual Oculus controller positions
    const inputSources = session.inputSources;
    for (let i = 0; i < inputSources.length; i++) {
        const source = inputSources[i];
        const pose = renderer.xr.getFrame().getPose(source.targetRaySpace, renderer.xr.getReferenceSpace());
        if (pose) {
            if (source.handedness === 'left') leftHand.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            if (source.handedness === 'right') rightHand.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
        }
    }
}
