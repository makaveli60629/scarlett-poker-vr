// /js/bot_system.js — BotSystem v2 (Humanoid Factory, Stylized)
// ✅ Bots are real low-poly humanoids like your reference
// ✅ Idle + walk + wander
// ✅ No skeleton needed (procedural joint rotations)

import { createHumanoid } from "./humanoid_factory.js";

export const BotSystem = (() => {
  const DEFAULTS = {
    count: 10,
    zone: { center: { x: 0, y: 0, z: 0 }, radius: 15 },
    speed: 0.75,
    turnSpeed: 1.25,
    personalSpace: 0.9,
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

    for (let i = 0; i < cfg.count; i++) {
      const mats = botMats(THREE, i);

      const h = createHumanoid(THREE, { scale: 1.0, materials: mats });
      h.root.name = `BOT_${i}`;

      const p = randomPointInZone(THREE, cfg.zone);
      h.root.position.copy(p);
      h.root.rotation.y = Math.random() * Math.PI * 2;

      // Add a subtle “name plate” feel later; for now just keep it clean
      group.add(h.root);

      bots.push({
        humanoid: h,
        root: h.root,
        parts: h.parts,
        state: {
          target: randomPointInZone(THREE, cfg.zone),
          pause: rand(cfg.minPause, cfg.maxPause),
          walking: false,
          phase: i * 0.67
        }
      });
    }

    log?.(`[bots] BotSystem v2 init ✅ humanoids=${bots.length}`);

    return {
      setActive(on) { group.visible = !!on; },
      update(dt, t) { updateBots(THREE, bots, cfg, dt, t); },
      getBots() { return bots; }
    };
  }

  function updateBots(THREE, bots, cfg, dt, t) {
    if (!bots.length) return;

    // light separation
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
          a.x += nx * push; a.z += nz * push;
          b.x -= nx * push; b.z -= nz * push;
        }
      }
    }

    for (const bot of bots) {
      const st = bot.state;
      const parts = bot.parts;

      // idle life
      parts.body.position.y = Math.sin(t * 1.6 + st.phase) * 0.02;
      parts.head.rotation.y = Math.sin(t * 0.9 + st.phase) * 0.12;

      st.pause -= dt;
      if (st.pause <= 0 && !st.walking) {
        st.target = randomPointInZone(THREE, cfg.zone);
        st.walking = true;
      }

      if (st.walking) {
        const p = bot.root.position;
        const tx = st.target.x - p.x;
        const tz = st.target.z - p.z;
        const dist = Math.sqrt(tx*tx + tz*tz);

        const desired = Math.atan2(tx, tz);
        bot.root.rotation.y = dampAngle(bot.root.rotation.y, desired, cfg.turnSpeed, dt);

        const step = cfg.speed * dt;
        if (dist > 0.25) {
          const yaw = bot.root.rotation.y;

          p.x += Math.sin(yaw) * step;
          p.z += Math.cos(yaw) * step;

          // procedural walk (rotate segmented joints)
          const walk = t * 6.0 + st.phase;
          const swing = Math.sin(walk) * 0.55;

          parts.armL.root.rotation.x =  swing * 0.55;
          parts.armR.root.rotation.x = -swing * 0.55;

          parts.legL.root.rotation.x = -swing * 0.65;
          parts.legR.root.rotation.x =  swing * 0.65;

          // slight elbow/knee follow-through
          parts.armL.foreRoot.rotation.x = -swing * 0.20;
          parts.armR.foreRoot.rotation.x =  swing * 0.20;
          parts.legL.shinRoot.rotation.x =  swing * 0.18;
          parts.legR.shinRoot.rotation.x = -swing * 0.18;
        } else {
          st.walking = false;
          st.pause = rand(cfg.minPause, cfg.maxPause);

          // settle
          parts.armL.root.rotation.x *= 0.2;
          parts.armR.root.rotation.x *= 0.2;
          parts.legL.root.rotation.x *= 0.2;
          parts.legR.root.rotation.x *= 0.2;
          parts.armL.foreRoot.rotation.x *= 0.2;
          parts.armR.foreRoot.rotation.x *= 0.2;
          parts.legL.shinRoot.rotation.x *= 0.2;
          parts.legR.shinRoot.rotation.x *= 0.2;
        }
      } else {
        // idle settle
        parts.armL.root.rotation.x *= 0.9;
        parts.armR.root.rotation.x *= 0.9;
        parts.legL.root.rotation.x *= 0.9;
        parts.legR.root.rotation.x *= 0.9;
        parts.armL.foreRoot.rotation.x *= 0.9;
        parts.armR.foreRoot.rotation.x *= 0.9;
        parts.legL.shinRoot.rotation.x *= 0.9;
        parts.legR.shinRoot.rotation.x *= 0.9;
      }
    }
  }

  function botMats(THREE, i) {
    // rotate subtle outfit tones so bots don’t all look cloned
    const palette = [0x1c2433, 0x151d2b, 0x222c3f, 0x182237];
    const clothColor = palette[i % palette.length];

    return {
      skin: new THREE.MeshStandardMaterial({ color: 0xd9c7b3, roughness: 0.88, metalness: 0.02 }),
      cloth: new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.96, metalness: 0.03 }),
      accent: new THREE.MeshStandardMaterial({
        color: 0xc8d3ff, roughness: 0.35, metalness: 0.55,
        emissive: new THREE.Color(0x223cff), emissiveIntensity: 0.06
      })
    };
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
      } else out[k] = extra[k];
    }
    return out;
  }

  return { init };
})();
