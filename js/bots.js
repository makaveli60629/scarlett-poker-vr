import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function makeBot(i) {
  const g = new THREE.Group();
  g.name = `bot_${i}`;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.42, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 })
  );
  body.position.y = 0.75;
  g.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x6a6f7c, roughness: 0.85 })
  );
  head.position.y = 1.25;
  g.add(head);

  // Small “badge”
  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 18),
    new THREE.MeshBasicMaterial({ color: 0x44ccff })
  );
  badge.position.set(0.0, 0.95, 0.19);
  g.add(badge);

  return g;
}

export const Bots = {
  build(scene, rig, ctx) {
    const bots = [];
    const seats = ctx?.table?.seats || [];
    const center = ctx?.rooms?.poker?.pos || new THREE.Vector3(0, 0, -34);

    const count = Math.max(6, seats.length || 6);

    for (let i = 0; i < count; i++) {
      const b = makeBot(i);

      if (seats[i]) {
        // HARD SNAP to seat anchor (same source chairs use)
        b.position.copy(seats[i].position);
        b.position.y = 0; // feet on floor
        b.rotation.set(0, seats[i].rotationY, 0);

        // Push them back away from rim so they never intersect the table
        const back = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          b.rotation.y
        );
        b.position.addScaledVector(back, 0.55);

        // Face table center
        b.lookAt(center.x, 1.1, center.z);

        // Lock upright (kills “leaning”)
        b.rotation.x = 0;
        b.rotation.z = 0;
      } else {
        // Fallback ring
        const ang = (i / count) * Math.PI * 2;
        b.position.set(center.x + Math.cos(ang) * 5.2, 0, center.z + Math.sin(ang) * 4.6);
        b.lookAt(center.x, 1.1, center.z);
        b.rotation.x = 0;
        b.rotation.z = 0;
      }

      scene.add(b);
      bots.push(b);
    }

    ctx.bots = bots;
    return bots;
  },
};

export default Bots;
