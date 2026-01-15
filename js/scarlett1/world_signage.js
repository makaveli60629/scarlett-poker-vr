// /js/scarlett1/world_signage.js
import { C } from "./world_constants.js";

export function buildSignage(THREE, group, mats) {
  const signs = [];

  function addSign(text, pos, rotY, mat) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 0.2), mats.wall);
    frame.position.copy(pos);
    frame.rotation.y = rotY;

    const glow = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.0, 0.08), mat);
    glow.position.copy(pos);
    glow.position.y += 0.02;
    glow.rotation.y = rotY;

    // “Text” fake via thin bars (Quest-safe)
    const bars = new THREE.Group();
    for (let i = 0; i < Math.min(8, text.length); i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.06), mat);
      b.position.set((-1.6 + i * 0.45), 0, 0.12);
      bars.add(b);
    }
    bars.position.copy(pos);
    bars.position.y -= 0.02;
    bars.rotation.y = rotY;

    group.add(frame, glow, bars);
    signs.push(glow);
  }

  // Place signs on the lobby ring near each hallway entrance
  const r = C.LOBBY_R - 1.5;
  addSign("STORE", new THREE.Vector3(0, 3.2, -r), 0, mats.neonCyan);
  addSign("VIP",   new THREE.Vector3(r, 3.2, 0), -Math.PI / 2, mats.neonMagenta);
  addSign("SCORP", new THREE.Vector3(0, 3.2, r), Math.PI, mats.neonGreen);
  addSign("GAMES", new THREE.Vector3(-r, 3.2, 0), Math.PI / 2, mats.neonCyan);

  return {
    update(dt) {
      const t = (performance.now() || 0) * 0.001;
      const k = 0.92 + Math.sin(t * 1.8) * 0.08;
      for (const s of signs) {
        if (s?.material?.emissiveIntensity != null) s.material.emissiveIntensity = k;
      }
    }
  };
}
