import { THREE } from '../core/engine.js';

function makeBot({ color=0x3b82f6, seated=false }={}) {
  // Lightweight “promo” humanoid: head + torso + hips + upper legs + forearms.
  // No skinning/animation (Quest-safe), but reads as a real seated body.
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08 });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.85, metalness: 0.0 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.9, metalness: 0.0 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 10), bodyMat);
  torso.position.y = seated ? 1.05 : 1.25;
  torso.rotation.x = seated ? 0.22 : 0.0;
  g.add(torso);

  // Hips / pelvis
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), bodyMat);
  hips.position.y = seated ? 0.78 : 0.95;
  hips.position.z = seated ? -0.10 : 0.0;
  g.add(hips);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), headMat);
  head.position.y = seated ? 1.55 : 1.82;
  head.position.z = seated ? -0.06 : 0.0;
  g.add(head);

  // Legs (upper legs angled forward in seated pose)
  const thighGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.52, 10);
  const shinGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.50, 10);
  const footGeo = new THREE.BoxGeometry(0.16, 0.06, 0.28);

  const mkLeg = (side=1) => {
    const leg = new THREE.Group();
    const thigh = new THREE.Mesh(thighGeo, limbMat);
    const shin = new THREE.Mesh(shinGeo, limbMat);
    const foot = new THREE.Mesh(footGeo, limbMat);

    thigh.position.y = -0.18;
    shin.position.y = -0.60;
    foot.position.set(0, -0.86, 0.08);

    leg.add(thigh, shin, foot);
    leg.position.set(0.16 * side, seated ? 0.82 : 1.0, seated ? 0.10 : 0.0);
    leg.rotation.x = seated ? -1.05 : 0.0;
    return leg;
  };
  g.add(mkLeg(1), mkLeg(-1));

  // Arms (rests toward table)
  const upperGeo = new THREE.CylinderGeometry(0.055, 0.06, 0.42, 10);
  const foreGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.38, 10);
  const handGeo = new THREE.SphereGeometry(0.06, 10, 10);

  const mkArm = (side=1) => {
    const a = new THREE.Group();
    const upper = new THREE.Mesh(upperGeo, limbMat);
    const fore = new THREE.Mesh(foreGeo, limbMat);
    const hand = new THREE.Mesh(handGeo, limbMat);
    upper.position.y = -0.06;
    fore.position.y = -0.34;
    hand.position.y = -0.56;
    a.add(upper, fore, hand);

    a.position.set(0.30 * side, seated ? 1.30 : 1.55, seated ? -0.10 : 0.0);
    a.rotation.z = 0.35 * side;
    a.rotation.x = seated ? 0.95 : 0.25;
    return a;
  };
  g.add(mkArm(1), mkArm(-1));

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
