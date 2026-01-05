import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function makeBot() {
  const g = new THREE.Group();

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

  return g;
}

export const Bots = {
  build(scene, rig, ctx) {
    const bots = [];
    const seats = ctx?.table?.seats || [];

    // If seats exist, place bots there, else fallback ring around poker room center
    const center = ctx?.rooms?.poker?.pos || new THREE.Vector3(0, 0, -34);

    const count = 6;
    for (let i = 0; i < count; i++) {
      const b = makeBot();
      b.name = `bot_${i}`;

      if (seats[i]) {
        b.position.copy(seats[i].position);
        b.position.y = 0; // stand on floor
        b.rotation.y = seats[i].rotationY;
        // Pull them back slightly so they never clip into the table
        const back = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0,1,0), b.rotation.y);
        b.position.addScaledVector(back, 0.45);
      } else {
        const ang = (i / count) * Math.PI * 2;
        b.position.set(center.x + Math.cos(ang) * 5.2, 0, center.z + Math.sin(ang) * 4.6);
        b.lookAt(center.x, 0, center.z);
      }

      // Force upright
      b.rotation.x = 0;
      b.rotation.z = 0;

      scene.add(b);
      bots.push(b);
    }

    ctx.bots = bots;
    return bots;
  },
};

export default Bots;
