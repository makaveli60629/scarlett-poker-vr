// /js/bot_system.js — BotSystem v1 (Stylized Low-Poly Humanoids)
// ✅ Elegant low-poly humanoid mesh (not squares)
// ✅ Idle + procedural walk + wander within zones
// ✅ Light CPU: no skeleton, simple transforms
// ✅ Safe to run on Quest (keep counts modest)

export const BotSystem = (() => {
  const DEFAULTS = {
    count: 10,
    zone: { center: { x: 0, y: 0, z: 0 }, radius: 14 }, // lobby ring
    speed: 0.65,
    turnSpeed: 1.2,
    personalSpace: 0.9,
    wanderJitter: 0.45,
    minPause: 0.6,
    maxPause: 2.0,
  };

  function init(ctx, opts = {}) {
    const { THREE, root, log } = ctx;
    const cfg = merge(DEFAULTS, opts);

    const group = new THREE.Group();
    group.name = "BOTS";
    root.add(group);

    const bots = [];

    // Materials (humanoid vibe)
    const matSkin = new THREE.MeshStandardMaterial({
      color: 0xd9c7b3, roughness: 0.85, metalness: 0.02
    });
    const matOutfit = new THREE.MeshStandardMaterial({
      color: 0x1c2433, roughness: 0.95, metalness: 0.04
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: 0xc8d3ff, roughness: 0.35, metalness: 0.55,
      emissive: new THREE.Color(0x223cff), emissiveIntensity: 0.08
    });

    for (let i = 0; i < cfg.count; i++) {
      const bot = makeBot(THREE, matSkin, matOutfit, matAccent);
      bot.root.position.copy(randomPointInZone(THREE, cfg.zone));
      bot.root.rotation.y = Math.random() * Math.PI * 2;
      bot.state = makeState(bot.root.position, cfg);
      bot.state.phase = i * 0.65;

      group.add(bot.root);
      bots.push(bot);
    }

    log?.(`[bots] BotSystem v1 init ✅ count=${bots.length}`);

    return {
      setActive(on) { group.visible = !!on; },
      update(dt, t) { updateBots(ctx, bots, cfg, dt, t); },
      getBots() { return bots; }
    };
  }

  function makeBot(THREE, matSkin, matOutfit, matAccent) {
    const root = new THREE.Group();
    root.name = "BOT";

    // proportions (stylized)
    const body = new THREE.Group();
    root.add(body);

    const hips = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), matOutfit);
    hips.scale.set(1.15, 0.75, 0.95);
    hips.position.set(0, 1.00, 0);
    body.add(hips);

    const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), matOutfit);
    chest.scale.set(1.15, 1.55, 0.85);
    chest.position.set(0, 1.30, 0.02);
    body.add(chest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.11, 8), matSkin);
    neck.position.set(0, 1.56, 0.03);
    body.add(neck);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), matSkin);
    head.scale.set(1.0, 1.05, 0.95);
    head.position.set(0, 1.75, 0.03);
    body.add(head);

    // hair/hat accent
    const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(0.155, 0), matAccent);
    hair.scale.set(1.02, 0.65, 1.02);
    hair.position.set(0, 1.86, 0.02);
    body.add(hair);

    // shoulders
    const shoulders = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), matOutfit);
    shoulders.scale.set(1.7, 0.7, 0.9);
    shoulders.position.set(0, 1.45, 0.02);
    body.add(shoulders);

    // limbs (procedural swing)
    const armL = makeLimb(THREE, matOutfit, matSkin);
    const armR = makeLimb(THREE, matOutfit, matSkin);
    armL.root.position.set(-0.22, 1.42, 0.02);
    armR.root.position.set( 0.22, 1.42, 0.02);
    armL.root.rotation.z =  0.08;
    armR.root.rotation.z = -0.08;
    body.add(armL.root, armR.root);

    const legL = makeLeg(THREE, matOutfit);
    const legR = makeLeg(THREE, matOutfit);
    legL.root.position.set(-0.11, 0.90, 0.00);
    legR.root.position.set( 0.11, 0.90, 0.00);
    body.add(legL.root, legR.root);

    // simple “shoe” base (helps ground contact)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.08, 10), matOutfit);
    base.position.set(0, 0.06, 0);
    root.add(base);

    return {
      root,
      body,
      head,
      armL,
      armR,
      legL,
      legR
    };
  }

  function makeLimb(THREE, matOutfit, matSkin) {
    const root = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.26, 8), matOutfit);
    upper.position.set(0, -0.13, 0);
    root.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.050, 0.24, 8), matOutfit);
    lower.position.set(0, -0.38, 0.02);
    root.add(lower);

    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), matSkin);
    hand.scale.set(0.85, 0.55, 1.05);
    hand.position.set(0, -0.52, 0.02);
    root.add(hand);

    return { root, upper, lower, hand };
  }

  function makeLeg(THREE, matOutfit) {
    const root = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.070, 0.30, 8), matOutfit);
    upper.position.set(0, -0.15, 0);
    root.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.065, 0.28, 8), matOutfit);
    lower.position.set(0, -0.43, 0.02);
    root.add(lower);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.18), matOutfit);
    foot.position.set(0, -0.58, 0.05);
    root.add(foot);

    return { root, upper, lower, foot };
  }

  function makeState(pos, cfg) {
    return {
      target: { x: pos.x, y: pos.y, z: pos.z },
      pause: rand(cfg.minPause, cfg.maxPause),
      walking: false,
      phase: 0,
    };
  }

  function updateBots(ctx, bots, cfg, dt, t) {
    const { THREE } = ctx;
    if (!bots.length) return;

    // tiny separation so they don't clump
    for (let i = 0; i < bots.length; i++) {
      const a = bots[i].root.position;
      for (let j = i + 1; j < bots.length; j++) {
        const b = bots[j].root.position;
        const dx = a.x - b.x, dz = a.z - b.z;
        const d2 = dx*dx + dz*dz;
        const min = cfg.personalSpace;
        if (d2 > 0.00001 && d2 < min*min) {
          const d = Math.sqrt(d2);
          const push = (min - d) * 0.18;
          const nx = dx / d, nz = dz / d;
          a.x += nx * push;
          a.z += nz * push;
          b.x -= nx * push;
          b.z -= nz * push;
        }
      }
    }

    for (const bot of bots) {
      const st = bot.state;

      // Idle breathing + micro head turn
      bot.body.position.y = Math.sin(t * 1.6 + st.phase) * 0.02;
      bot.head.rotation.y = Math.sin(t * 0.9 + st.phase) * 0.12;

      // Wander logic
      st.pause -= dt;
      if (st.pause <= 0 && !st.walking) {
        // pick a new target inside zone
        const p = randomPointInZone(THREE, cfg.zone);
        st.target.x = p.x;
        st.target.y = p.y;
        st.target.z = p.z;
        st.walking = true;
      }

      if (st.walking) {
        const p = bot.root.position;
        const tx = st.target.x - p.x;
        const tz = st.target.z - p.z;
        const dist = Math.sqrt(tx*tx + tz*tz);

        // turn toward target smoothly
        const desired = Math.atan2(tx, tz);
        bot.root.rotation.y = dampAngle(bot.root.rotation.y, desired, cfg.turnSpeed, dt);

        // move
        const step = cfg.speed * dt;
        if (dist > 0.25) {
          // small wander jitter
          const jitter = Math.sin((t + st.phase) * 1.7) * cfg.wanderJitter * 0.02;
          const yaw = bot.root.rotation.y + jitter;

          p.x += Math.sin(yaw) * step;
          p.z += Math.cos(yaw) * step;

          // procedural walk swing
          const walk = t * 6.0 + st.phase;
          const swing = Math.sin(walk) * 0.55;
          bot.armL.root.rotation.x =  swing * 0.55;
          bot.armR.root.rotation.x = -swing * 0.55;
          bot.legL.root.rotation.x = -swing * 0.65;
          bot.legR.root.rotation.x =  swing * 0.65;
        } else {
          // arrive -> pause
          st.walking = false;
          st.pause = rand(cfg.minPause, cfg.maxPause);

          // settle limbs
          bot.armL.root.rotation.x *= 0.2;
          bot.armR.root.rotation.x *= 0.2;
          bot.legL.root.rotation.x *= 0.2;
          bot.legR.root.rotation.x *= 0.2;
        }
      } else {
        // idle limb settle
        bot.armL.root.rotation.x *= 0.9;
        bot.armR.root.rotation.x *= 0.9;
        bot.legL.root.rotation.x *= 0.9;
        bot.legR.root.rotation.x *= 0.9;
      }
    }
  }

  function randomPointInZone(THREE, zone) {
    const cx = zone.center.x, cy = zone.center.y, cz = zone.center.z;
    const r = zone.radius * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector3(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r);
  }

  function dampAngle(a, b, speed, dt) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + d * Math.min(1, speed * dt);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function merge(base, extra) {
    const out = JSON.parse(JSON.stringify(base));
    for (const k in extra) {
      if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k])) {
        out[k] = { ...(out[k] || {}), ...extra[k] };
      } else {
        out[k] = extra[k];
      }
    }
    return out;
  }

  return { init };
})();
