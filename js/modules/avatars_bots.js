import { THREE } from '../core/engine.js';

function makeBot({ color=0x3b82f6, seated=false }={}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
  );
  body.position.y = seated ? 0.78 : 1.05;
  if (seated) body.rotation.x = 0.10;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.8, metalness: 0.0 })
  );
  head.position.y = seated ? 1.28 : 1.65;

  // Simple arms (for promo clarity)
  const armMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.8, metalness: 0.0 });
  const upperGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.42, 10);
  const foreGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.38, 10);
  const handGeo = new THREE.SphereGeometry(0.06, 10, 10);

  const mkArm = (side=1) => {
    const a = new THREE.Group();
    const upper = new THREE.Mesh(upperGeo, armMat);
    const fore = new THREE.Mesh(foreGeo, armMat);
    const hand = new THREE.Mesh(handGeo, armMat);
    upper.position.y = -0.02;
    fore.position.y = -0.32;
    hand.position.y = -0.55;
    a.add(upper, fore, hand);
    a.position.set(0.22 * side, seated ? 1.02 : 1.3, seated ? -0.08 : 0.02);
    a.rotation.z = 0.45 * side;
    a.rotation.x = seated ? 0.65 : 0.2;
    return a;
  };

  g.add(body, head, mkArm(1), mkArm(-1));
  return g;
}

export function AvatarsBotsModule() {
  return {
    name: 'avatars_bots',
    init(engine) {
      const s = engine.scene;

      const pitY = -1.22; // match table height in the divot

      // Guard at pit edge
      const guard = makeBot({ color: 0x111827 });
      guard.position.set(-6.5, pitY, -2.0);
      guard.rotation.y = Math.PI / 2;
      s.add(guard);

      // Spectator
      const spec = makeBot({ color: 0x16a34a });
      spec.position.set(6.5, pitY, -2.5);
      spec.rotation.y = -Math.PI / 2;
      s.add(spec);

      // Seated players (match the chair ring in table_poker.js)
      const seats = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        seats.push({
          x: Math.cos(a) * 6.0,
          z: Math.sin(a) * 6.0,
          r: -a + Math.PI/2,
        });
      }

      // 5 bots + 1 open seat for player
      for (let i = 0; i < 6; i++) {
        if (i === 0) continue; // open seat
        const bot = makeBot({ color: [0xef4444,0xf59e0b,0x3b82f6,0xa855f7,0x06b6d4][(i-1)%5], seated: true });
        bot.position.set(seats[i].x, pitY, seats[i].z);
        bot.rotation.y = seats[i].r;
        s.add(bot);
      }
    },
  };
}
