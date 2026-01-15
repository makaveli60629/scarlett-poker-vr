// /js/scarlett1/world_signage.js — FIXED
// Must export: buildSignage()
// Returns: { update(dt) }

import { C } from "./world_constants.js";

export function buildSignage(THREE, group, mats) {
  const glows = [];

  function addSign(label, pos, rotY, glowMat) {
    // Frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 1.6, 0.22),
      mats.wall
    );
    frame.position.copy(pos);
    frame.rotation.y = rotY;

    // Glow plate
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(5.7, 1.05, 0.08),
      glowMat
    );
    glow.position.copy(pos);
    glow.position.y += 0.02;
    glow.position.z += 0.12;
    glow.rotation.y = rotY;

    // Fake “text” blocks (Quest-safe)
    const blocks = new THREE.Group();
    const n = Math.max(3, Math.min(10, label.length));
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.55, 0.06),
        glowMat
      );
      b.position.set(-1.9 + i * 0.42, 0, 0.16);
      blocks.add(b);
    }
    blocks.position.copy(pos);
    blocks.position.y -= 0.04;
    blocks.rotation.y = rotY;

    group.add(frame, glow, blocks);
    glows.push(glow);
  }

  // Place signs just inside lobby ring, facing inward
  const r = C.LOBBY_R - 1.6;

  // North (Z negative) faces toward +Z => rotY = 0
  addSign("STORE", new THREE.Vector3(0, 3.2, -r), 0, mats.neonCyan);

  // East (X positive) faces toward -X => rotY = -PI/2
  addSign("VIP", new THREE.Vector3(r, 3.2, 0), -Math.PI / 2, mats.neonMagenta);

  // South (Z positive) faces toward -Z => rotY = PI
  addSign("SCORP", new THREE.Vector3(0, 3.2, r), Math.PI, mats.neonGreen);

  // West (X negative) faces toward +X => rotY = +PI/2
  addSign("GAMES", new THREE.Vector3(-r, 3.2, 0), Math.PI / 2, mats.neonCyan);

  return {
    update(dt) {
      // subtle pulse (safe)
      const t = (performance.now() || 0) * 0.001;
      const k = 0.92 + Math.sin(t * 1.8) * 0.08;

      for (const g of glows) {
        const m = g?.material;
        if (m && typeof m.emissiveIntensity === "number") {
          m.emissiveIntensity = k;
        }
      }
    }
  };
}
