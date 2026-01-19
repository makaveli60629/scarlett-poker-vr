import { THREE } from '../core/engine.js';

function makeBot({ color=0x3b82f6 }={}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
  );
  body.position.y = 1.05;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.8, metalness: 0.0 })
  );
  head.position.y = 1.65;
  g.add(body, head);
  return g;
}

export function AvatarsBotsModule() {
  return {
    name: 'avatars_bots',
    init(engine) {
      const s = engine.scene;

      // Guard at pit edge
      const guard = makeBot({ color: 0x111827 });
      guard.position.set(-6.5, 0, -2.0);
      guard.rotation.y = Math.PI / 2;
      s.add(guard);

      // Spectator
      const spec = makeBot({ color: 0x16a34a });
      spec.position.set(6.5, 0, -2.5);
      spec.rotation.y = -Math.PI / 2;
      s.add(spec);

      // Seated players (around table)
      const seats = [
        { x: 1.7, z: 0.0 },
        { x: 0.85, z: 1.45 },
        { x: -0.85, z: 1.45 },
        { x: -1.7, z: 0.0 },
        { x: -0.85, z: -1.45 },
        { x: 0.85, z: -1.45 },
      ];

      // 5 bots + 1 open seat for player
      for (let i = 0; i < 6; i++) {
        if (i === 0) continue; // open seat
        const bot = makeBot({ color: [0xef4444,0xf59e0b,0x3b82f6,0xa855f7,0x06b6d4][(i-1)%5] });
        bot.position.set(seats[i].x, 0, seats[i].z);
        bot.rotation.y = Math.atan2(-seats[i].x, -seats[i].z);
        s.add(bot);
      }
    },
  };
}
