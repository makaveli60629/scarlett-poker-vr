import * as THREE from 'three';

export const Controls = {
    teleportBeam: new THREE.Line(),
    targetMarker: new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.4, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
    ),
    isLeftMenuOpen: false,
    isRightMenuOpen: false,

    init(scene, playerGroup) {
        // Setup teleport marker
        this.targetMarker.rotation.x = -Math.PI / 2;
        this.targetMarker.visible = false;
        scene.add(this.targetMarker);

        // Setup teleport beam (The Laser)
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)]);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        this.teleportBeam = new THREE.Line(geometry, material);
        this.teleportBeam.visible = false;
        playerGroup.add(this.teleportBeam);
    },

    update(renderer, camera, playerGroup) {
        const session = renderer.xr.getSession();
        if (!session) return;

        for (const source of session.inputSources) {
            // 1. WRIST MENU LOGIC (Flip wrist up)
            if (source.hand) {
                const wrist = source.hand.get(0); // Wrist joint
                const middle = source.hand.get(9); // Middle finger base
                if (wrist && middle) {
                    // Check if palm is facing the face
                    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
                    const palmNormal = new THREE.Vector3().subVectors(middle.position, wrist.position).normalize();
                    const isFlipped = palmNormal.dot(up) < -0.5; // Detects wrist flip
                    
                    if (source.handedness === 'left') this.isLeftMenuOpen = isFlipped;
                    if (source.handedness === 'right') this.isRightMenuOpen = isFlipped;
                }

                // 2. PINCH TO TELEPORT (The Laser)
                const indexTip = source.hand.get(8);
                const thumbTip = source.hand.get(4);
                if (indexTip && thumbTip) {
                    const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.02;
                    
                    if (isPinching) {
                        this.showLaser(indexTip, camera, scene);
                    } else if (this.teleportBeam.visible) {
                        this.teleport(playerGroup);
                    }
                }
            }
        }
    },

    showLaser(handPos, camera) {
        this.teleportBeam.visible = true;
        this.targetMarker.visible = true;
        // Logic to project laser onto the floor would go here
    },

    teleport(playerGroup) {
        if (this.targetMarker.visible) {
            playerGroup.position.copy(this.targetMarker.position);
            this.teleportBeam.visible = false;
            this.targetMarker.visible = false;
        }
    }
};
