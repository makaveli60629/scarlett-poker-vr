// /js/avatar.js — bot avatar (canonical dimensions + slots)
// IMPORTANT: uses local ./three.js so all modules share one THREE instance.
import * as THREE from "./three.js";
import { BODY_DIMS } from "./body_dims.js";

export const Avatar = {
  create({ color = 0xffffff } = {}) {
    const g = new THREE.Group();
    g.name = "Avatar";

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(BODY_DIMS.torso.radius, BODY_DIMS.torso.height, 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 })
    );
    body.position.y = BODY_DIMS.torso.centerY;
    body.name = "chest";
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(BODY_DIMS.head.radius, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 })
    );
    head.position.y = BODY_DIMS.head.centerY;
    head.name = "head";
    g.add(head);

    // Slots (do not rewrite later)
    g.userData.slots = {
      head,
      chest: body,
      leftWrist: new THREE.Object3D(),
      rightWrist: new THREE.Object3D(),
    };

    g.userData.slots.leftWrist.position.set(BODY_DIMS.wrists.left.x, BODY_DIMS.wrists.left.y, BODY_DIMS.wrists.left.z);
    g.userData.slots.rightWrist.position.set(BODY_DIMS.wrists.right.x, BODY_DIMS.wrists.right.y, BODY_DIMS.wrists.right.z);

    g.add(g.userData.slots.leftWrist, g.userData.slots.rightWrist);

    return g;
  },
};
