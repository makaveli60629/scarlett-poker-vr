function makeBot(env, color=0x8aa4ff) {
  const { THREE } = env;
  const g = new THREE.Group();

  const torsoGeo = new THREE.CapsuleGeometry(0.18, 0.5, 6, 12);
  const torsoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  g.add(torso);

  const headGeo = new THREE.SphereGeometry(0.16, 22, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf1d6c2, roughness: 0.85 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.55, 0);
  head.castShadow = true;
  g.add(head);

  const shoulderGeo = new THREE.SphereGeometry(0.09, 16, 12);
  const limbGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12);
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x0f1a24, roughness: 0.8 });

  const leftShoulder = new THREE.Mesh(shoulderGeo, limbMat);
  leftShoulder.position.set(-0.22, 1.25, 0);
  g.add(leftShoulder);
  const rightShoulder = new THREE.Mesh(shoulderGeo, limbMat);
  rightShoulder.position.set(0.22, 1.25, 0);
  g.add(rightShoulder);

  const leftArm = new THREE.Mesh(limbGeo, limbMat);
  leftArm.position.set(-0.3, 1.05, 0.05);
  leftArm.rotation.z = 0.9;
  g.add(leftArm);
  const rightArm = new THREE.Mesh(limbGeo, limbMat);
  rightArm.position.set(0.3, 1.05, 0.05);
  rightArm.rotation.z = -0.9;
  g.add(rightArm);

  // little "butt" for debug
  const hipGeo = new THREE.SphereGeometry(0.12, 16, 12);
  const hip = new THREE.Mesh(hipGeo, limbMat);
  hip.position.set(0, 0.78, -0.02);
  g.add(hip);

  return { g, head, torso };
}

function makeCardPair(env, baseY, hoverY) {
  const { THREE } = env;
  const cardW = 0.09;
  const cardH = 0.13;
  const geo = new THREE.PlaneGeometry(cardW, cardH);
  const mat1 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 });

  const c1 = new THREE.Mesh(geo, mat1);
  const c2 = new THREE.Mesh(geo, mat2);

  // simple suit marks via emissive tint
  c1.material.emissive.setHex(0x221111);
  c2.material.emissive.setHex(0x112222);

  c1.castShadow = true;
  c2.castShadow = true;

  const h1 = new THREE.Mesh(geo, mat1.clone());
  const h2 = new THREE.Mesh(geo, mat2.clone());
  h1.material.emissive.setHex(0x221111);
  h2.material.emissive.setHex(0x112222);

  h1.position.y = hoverY;
  h2.position.y = hoverY;

  return { table: [c1, c2], hover: [h1, h2] };
}

export const module_avatars_bots = {
  id: 'avatars_bots',
  async init(env) {
    const { THREE, scene } = env;
    const table = env.world?.table;
    if (!table) {
      env.log?.('avatars_bots skipped (no table)');
      return {};
    }

    const bots = [];
    const seats = table.seats.filter(s => !s.open);

    for (let i=0;i<seats.length;i++) {
      const seat = seats[i];
      const bot = makeBot(env, [0x7c4dff, 0x4dd0ff, 0xffd54d, 0xff5c93, 0x7cff6b][i % 5]);

      // sit position (slightly inward toward table)
      const r = 2.15;
      bot.g.position.set(Math.cos(seat.angle)*r, -table.depth, Math.sin(seat.angle)*r);
      bot.g.rotation.y = -seat.angle + Math.PI;

      // cards: flat on table, plus hover mirror above
      const cards = makeCardPair(env, 0, 1.35);
      const cardBase = new THREE.Group();
      cardBase.position.set(Math.cos(seat.angle)*1.25, -table.depth + 0.82, Math.sin(seat.angle)*1.25);
      cardBase.rotation.y = -seat.angle + Math.PI;

      // table cards (flat)
      cards.table[0].position.set(-0.06, 0.002, 0);
      cards.table[1].position.set(0.06, 0.002, 0);
      cards.table[0].rotation.x = -Math.PI/2;
      cards.table[1].rotation.x = -Math.PI/2;
      cardBase.add(cards.table[0], cards.table[1]);

      // hovering mirror (upright, facing outward)
      const hover = new THREE.Group();
      hover.position.copy(cardBase.position);
      hover.position.y += 0.95;
      hover.rotation.y = cardBase.rotation.y;

      cards.hover[0].position.set(-0.06, 0, 0);
      cards.hover[1].position.set(0.06, 0, 0);
      // face the lobby
      cards.hover[0].rotation.y = Math.PI;
      cards.hover[1].rotation.y = Math.PI;

      hover.add(cards.hover[0], cards.hover[1]);

      // subtle glow behind hover cards
      const glowGeo = new THREE.PlaneGeometry(0.28, 0.18);
      const glowMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, emissive: 0x4dd0ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.45 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(0, 0, -0.01);
      hover.add(glow);

      scene.add(bot.g);
      scene.add(cardBase);
      scene.add(hover);

      bots.push({ bot, seat, cardBase, hover, glow });
    }

    env.world.bots = bots;
    env.log?.(`bots ready ✅ count=${bots.length}`);

    return {
      handles: { bots },
      update(dt) {
        const t = performance.now() * 0.0015;
        for (let i=0;i<bots.length;i++) {
          const b = bots[i];
          // idle head bob
          b.bot.head.position.y = 1.55 + 0.02 * Math.sin(t + i);
          // hover cards pulse
          b.glow.material.emissiveIntensity = 0.6 + 0.25 * Math.sin(t*1.7 + i);
          // keep hover cards facing camera (non-VR helpful)
          if (!env.renderer.xr.isPresenting) {
            b.hover.lookAt(env.camera.getWorldPosition(env.tmp.v3));
            // rotate 180 so front faces camera
            b.hover.rotateY(Math.PI);
          }
        }
      }
    };
  }
};
