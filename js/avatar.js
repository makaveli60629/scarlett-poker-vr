// /js/avatar.js — shirt-compatible avatar
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { BODY_DIMS } from "./body_dims.js";

export const Avatar = {
  create({ color = 0xffffff } = {}) {
    const g = new THREE.Group();

    // === BODY (canonical dims) ===
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        BODY_DIMS.torso.radius,
        BODY_DIMS.torso.height,
        6,
        12
      ),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.05,
      })
    );
    body.position.y = BODY_DIMS.torso.centerY;
    body.name = "chest";
    g.add(body);

    // === HEAD ===
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(BODY_DIMS.head.radius, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xf2d6c9,
        roughness: 0.85,
      })
    );
    head.position.y = BODY_DIMS.head.centerY;
    head.name = "head";
    g.add(head);

    // === SLOTS (UNCHANGED — GOOD DESIGN) ===
    g.userData.slots = {
      head,
      chest: body,
      leftWrist: new THREE.Object3D(),
      rightWrist: new THREE.Object3D(),
    };

    g.userData.slots.leftWrist.position.set(-0.22, 0.95, 0);
    g.userData.slots.rightWrist.position.set(0.22, 0.95, 0);
    g.add(g.userData.slots.leftWrist, g.userData.slots.rightWrist);

    return g;
  },
};
