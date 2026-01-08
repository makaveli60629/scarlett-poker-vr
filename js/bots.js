// /js/bots.js — Scarlett Bots v2.4 (ROAM + RAIL SAFE + BETTER BODY ALIGN)
// Fixes:
// - bots.js no longer spawns hole cards (DealingMix owns real cards)
// - seated bots sit correctly on seat anchors (pelvis-to-seat math)
// - walkers roam with waypoints (not a herd circle) + stay OUTSIDE rail/table
// - slightly taller bots (closer to player height)
// - hands + better head placement (no head inside shirt)
// - billboarding name tag + chips tag

export const Bots = (() => {
  let THREE = null;
  let root = null;

  let seats = [];
  let tableFocus = null;
  let lobbyZone = { min: null, max: null };

  let playerRigRef = null;
  let cameraRef = null;

  const state = {
    seated: [],
    walkers: [],
    t: 0,
    metrics: { tableY: 0.92, seatY: 0.52 },
    railR: 3.75,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // pelvis joint so feet land on Y=0 when bot.position.y=0
  const PELVIS_BASE_Y = 0.52; // slightly taller than before

  function makeCanvasTag(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    // background
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    roundRect(ctx, 24, 44, 464, 168, 28, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 105);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 36px Arial";
    ctx.fillText("$" + Number(chips).toLocaleString(), 256, 160);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;

    function roundRect(ctx, x, y, w, h, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill) ctx.fill();
    }
  }

  function makeTag(name, chips) {
    const tex = makeCanvasTag(name, chips);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.34), mat);
    mesh.name = "NameTag";
    mesh.userData.set = (n, c) => {
      mesh.material.map = makeCanvasTag(n, c);
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    };
    return mesh;
  }

  function makeAvatar({ suitColor = 0x111318, skinColor = 0xd2b48c, name = "BOT", chips = 10000, female = false } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    // pelvis joint
    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y;
    g.add(pelvis);

    // torso / jacket (slightly taller)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.46, 8, 16), suit);
    torso.position.y = 0.54;
    pelvis.add(torso);

    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.24), suit);
    jacket.position.set(0, 0.54, 0.01);
    pelvis.add(jacket);

    // optional “skirt” silhouette for female (very simple)
    if (female) {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.24, 18), suit);
      skirt.position.set(0, 0.22, 0.01);
      pelvis.add(skirt);
    }

    // head higher (fix "head inside shirt")
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), skin);
    head.position.y = 0.88;
    pelvis.add(head);

    // arms + hands
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.26, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.052, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.24, 0.70, 0.03);
    armR.position.set( 0.24, 0.70, 0.03);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit); upperL.position.y = -0.13; armL.add(upperL);
    const upperR = new THREE.Mesh(armGeo, suit); upperR.position.y = -0.13; armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.30, 0.02); armL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.30, 0.02); armR.add(handR);

    // legs (hip -> knee -> foot)
    const thighGeo = new THREE.CapsuleGeometry(0.062, 0.28, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.056, 0.26, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.12, 0.05, 0.24);

    const hipL = new THREE.Group(); hipL.name = "hipL";
    const hipR = new THREE.Group(); hipR.name = "hipR";
    hipL.position.set(-0.10, 0.22, 0);
    hipR.position.set( 0.10, 0.22, 0);
    pelvis.add(hipL, hipR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.16; hipL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.16; hipR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.32; hipL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.32; hipR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.15; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.15; kneeR.add(shinR);

    const footL = new THREE.Mesh(footGeo, suit); footL.position.set(0, -0.32, 0.09); kneeL.add(footL);
    const footR = new THREE.Mesh(footGeo, suit); footR.position.set(0, -0.32, 0.09); kneeR.add(footR);

    // name tag
    const tag = makeTag(name, chips);
    tag.position.set(0, 1.52, 0);
    g.add(tag);

    g.userData = { pelvis, head, armL, armR, hipL, hipR, kneeL, kneeR, tag, sit: 0 };
    setSitAmount(g, 0);
    return g;
  }

  function setSitAmount(av, amt01) {
    const u = av.userData;
    const t = clamp(amt01, 0, 1);
    u.sit = t;

    const hipBend  = lerp(0.0, -0.62, t);
    const kneeBend = lerp(0.0,  1.28, t);

    u.hipL.rotation.x = hipBend;
    u.hipR.rotation.x = hipBend;
    u.kneeL.rotation.x = kneeBend;
    u.kneeR.rotation.x = kneeBend;

    u.armL.rotation.x = lerp(-0.12, -0.52, t);
    u.armR.rotation.x = lerp(-0.12, -0.52, t);
  }

  function billboardToPlayer(obj) {
    if (!obj) return;
    const ref = cameraRef || playerRigRef;
    if (!ref) return;
    const p = ref.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function addSeatedBot(seatIndex, name, chips, female = false) {
    const seat = seats[seatIndex];
    if (!seat) return null;

    const bot = makeAvatar({ name, chips, suitColor: 0x111318, female });
    bot.name = `SeatedBot_${seatIndex}`;

    // Seat position is world, so place bot so pelvis lands at seat surface
    bot.position.copy(seat.position);
    bot.position.y = seat.position.y - PELVIS_BASE_Y;
    bot.rotation.y = seat.yaw;

    setSitAmount(bot, 1);

    root.add(bot);
    state.seated.push(bot);
    return bot;
  }

  // Waypoint roaming walker
  function addWalker(i) {
    const bot = makeAvatar({
      name: "LOBBY",
      chips: 0,
      suitColor: 0x1a1f2a,
      female: (i % 4 === 0)
    });
    bot.name = `Walker_${i}`;
    bot.position.set(tableFocus.x + (Math.random() - 0.5) * 8, 0, tableFocus.z + 5 + Math.random() * 6);
    setSitAmount(bot, 0);

    const w = {
      bot,
      speed: 0.55 + Math.random() * 0.35,
      phase: Math.random() * 10,
      target: pickWaypoint(),
      linger: 0,
    };

    root.add(bot);
    state.walkers.push(w);
    return w;
  }

  function pickWaypoint() {
    // Blend between: table perimeter (observers) and lobby zone (wanderers)
    const wantObserve = Math.random() < 0.45;

    if (wantObserve) {
      const ang = Math.random() * Math.PI * 2;
      const r = 5.2 + Math.random() * 1.4; // outside rail
      return new THREE.Vector3(
        tableFocus.x + Math.cos(ang) * r,
        0,
        tableFocus.z + Math.sin(ang) * r
      );
    }

    // lobby zone
    const min = lobbyZone?.min || new THREE.Vector3(-6, 0, 6);
    const max = lobbyZone?.max || new THREE.Vector3( 6, 0, 12);
    return new THREE.Vector3(
      lerp(min.x, max.x, Math.random()),
      0,
      lerp(min.z, max.z, Math.random())
    );
  }

  function keepOutsideRail(pos) {
    const dx = pos.x - tableFocus.x;
    const dz = pos.z - tableFocus.z;
    const d = Math.hypot(dx, dz);
    const minD = state.railR + 0.95; // rail margin
    if (d < minD) {
      const s = minD / Math.max(0.0001, d);
      pos.x = tableFocus.x + dx * s;
      pos.z = tableFocus.z + dz * s;
    }
  }

  return {
    async init({ THREE: _THREE, scene, getSeats, getLobbyZone, tableFocus: _tf, metrics, railR } = {}) {
      THREE = _THREE;
      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      lobbyZone = (typeof getLobbyZone === "function") ? (getLobbyZone() || lobbyZone) : lobbyZone;
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      if (metrics) state.metrics = metrics;
      if (railR) state.railR = railR;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.seated.length = 0;
      state.walkers.length = 0;
      state.t = 0;

      // 5 seated (leave one seat for the PLAYER later)
      addSeatedBot(1, "LUNA", 10000, true);
      addSeatedBot(2, "JAX", 10000, false);
      addSeatedBot(3, "NOVA", 10000, true);
      addSeatedBot(4, "RAVEN", 10000, false);
      addSeatedBot(5, "KAI", 10000, false);

      // roaming lobby bots
      for (let i = 0; i < 10; i++) addWalker(i);

      console.log("[Bots] init ✅ seated=" + state.seated.length + " walkers=" + state.walkers.length);
    },

    setPlayerRig(rig, cam) { playerRigRef = rig || null; cameraRef = cam || null; },

    update(dt) {
      if (!root) return;
      state.t += dt;

      // walkers roam with gait + waypoint logic
      for (const w of state.walkers) {
        const b = w.bot;
        const u = b.userData;
        const t = state.t + w.phase;

        if (w.linger > 0) w.linger -= dt;
        if (w.linger <= 0) {
          const dxT = w.target.x - b.position.x;
          const dzT = w.target.z - b.position.z;
          const dist = Math.hypot(dxT, dzT);

          if (dist < 0.25) {
            w.target = pickWaypoint();
            w.linger = 0.5 + Math.random() * 1.8;
          } else {
            const vx = (dxT / Math.max(0.0001, dist)) * w.speed;
            const vz = (dzT / Math.max(0.0001, dist)) * w.speed;

            b.position.x += vx * dt;
            b.position.z += vz * dt;
            b.rotation.y = Math.atan2(vx, vz);
          }
        }

        // keep them OUTSIDE the rail
        keepOutsideRail(b.position);

        // gait
        const gait = Math.sin(t * 6.0);
        const bend = Math.abs(gait) * 0.65;

        u.hipL.rotation.x = -0.12 - bend * 0.50;
        u.kneeL.rotation.x = 0.22 + bend * 0.95;
        u.hipR.rotation.x = -0.12 - (1 - bend) * 0.50;
        u.kneeR.rotation.x = 0.22 + (1 - bend) * 0.95;

        const swing = gait * 0.6;
        u.armL.rotation.x = -0.20 + swing;
        u.armR.rotation.x = -0.20 - swing;

        // tiny bob
        b.position.y = Math.sin(t * 3.0) * 0.006;

        billboardToPlayer(u.tag);
      }

      // seated bots: breathing idle + tag billboard
      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x;

        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.6) * 0.008;

        u.armL.rotation.z = 0.10 + Math.sin(t * 2.2) * 0.10;
        u.armR.rotation.z = -0.10 - Math.sin(t * 2.2) * 0.10;

        billboardToPlayer(u.tag);
      }
    }
  };
})();
