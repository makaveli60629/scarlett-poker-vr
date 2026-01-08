// /js/bots.js — Scarlett Bots v2.4 (HEIGHT + SEAT ALIGN + TABLE WALKERS)
// - Bots scaled to human height (closer to player)
// - Seated bots pelvis “butt” lands on seat surface
// - Walkers orbit around TABLE (not walls)
// - Adds 1 guard near rail + 1 mannequin by teleporter
// - Only seated bots show hole cards above head
// - Name + chips tag billboard to player (if setPlayerRig called)

export const Bots = (() => {
  let THREE = null;
  let root = null;

  let seats = [];
  let lobbyZone = null;
  let tableFocus = null;

  let playerRigRef = null;
  let cameraRef = null;

  const state = {
    bots: [],
    seated: [],
    walkers: [],
    t: 0,
    metrics: { tableY: 0.92, seatY: 0.52 },
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Bot proportions
  const BOT_SCALE = 1.22; // taller = closer to player height
  const PELVIS_BASE_Y = 0.46; // pelvis local baseline (feet end up at y=0 when bot.position.y = 0)

  // ---------- CARD FACE (simple rank/suit) ----------
  function cardTexture(rank, suit) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 356;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, c.width - 12, c.height - 12);

    const isRed = (suit === "♥" || suit === "♦");
    ctx.fillStyle = isRed ? "#b6001b" : "#111111";

    ctx.font = "bold 54px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, 18, 14);
    ctx.font = "bold 60px Arial";
    ctx.fillText(suit, 18, 64);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 54px Arial";
    ctx.fillText(rank, c.width - 18, c.height - 68);
    ctx.font = "bold 60px Arial";
    ctx.fillText(suit, c.width - 18, c.height - 14);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 140px Arial";
    ctx.fillText(suit, c.width / 2, c.height / 2 + 10);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeHoleCards() {
    const g = new THREE.Group();
    g.name = "HoleCards";

    const geo = new THREE.PlaneGeometry(0.22, 0.30);
    const cardspec = [
      { r: "A", s: "♠" },
      { r: "K", s: "♦" },
    ];

    for (let i = 0; i < 2; i++) {
      const cs = cardspec[i];

      const face = new THREE.MeshStandardMaterial({
        map: cardTexture(cs.r, cs.s),
        roughness: 0.55,
        emissive: 0x111111,
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide
      });

      const back = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.55,
        emissive: 0x220010,
        emissiveIntensity: 0.45,
        side: THREE.DoubleSide
      });

      const card = new THREE.Group();
      const faceM = new THREE.Mesh(geo, face);
      const backM = new THREE.Mesh(geo, back);

      faceM.position.z = 0.001;
      backM.position.z = -0.001;
      backM.rotation.y = Math.PI;

      card.add(faceM, backM);
      card.position.x = i * 0.26;
      g.add(card);
    }
    return g;
  }

  // ---------- TAG ----------
  function makeCanvasTag(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = "rgba(0,0,0,0.60)";
    roundRect(ctx, 30, 44, 452, 168, 28, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 106);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 36px Arial";
    ctx.fillText("$" + Number(chips).toLocaleString(), 256, 168);

    const tex = new THREE.CanvasTexture(c);
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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.34), mat);
    mesh.name = "NameTag";
    mesh.userData.set = (n, c) => {
      mesh.material.map = makeCanvasTag(n, c);
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    };
    return mesh;
  }

  // ---------- AVATAR ----------
  function makeAvatar({ suitColor = 0x111318, skinColor = 0xd2b48c, name = "BOT", chips = 10000, withCards = false } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";
    g.scale.setScalar(BOT_SCALE);

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y;
    g.add(pelvis);

    // torso + jacket
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.40, 8, 16), suit);
    torso.position.y = 0.50;
    pelvis.add(torso);

    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.24), suit);
    jacket.position.set(0, 0.50, 0.02);
    pelvis.add(jacket);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), skin);
    head.position.y = 0.78;
    pelvis.add(head);

    // arms + hands
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.24, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.05, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.25, 0.62, 0.03);
    armR.position.set( 0.25, 0.62, 0.03);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit); upperL.position.y = -0.12; armL.add(upperL);
    const upperR = new THREE.Mesh(armGeo, suit); upperR.position.y = -0.12; armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.28, 0.03); armL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.28, 0.03); armR.add(handR);

    // legs
    const thighGeo = new THREE.CapsuleGeometry(0.06, 0.26, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.24, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.12, 0.05, 0.22);

    const hipL = new THREE.Group(); hipL.name = "hipL";
    const hipR = new THREE.Group(); hipR.name = "hipR";
    hipL.position.set(-0.10, 0.20, 0);
    hipR.position.set( 0.10, 0.20, 0);
    pelvis.add(hipL, hipR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.15; hipL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.15; hipR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.30; hipL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.30; hipR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.14; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.14; kneeR.add(shinR);

    const footL = new THREE.Mesh(footGeo, suit); footL.position.set(0, -0.30, 0.08); kneeL.add(footL);
    const footR = new THREE.Mesh(footGeo, suit); footR.position.set(0, -0.30, 0.08); kneeR.add(footR);

    // tag
    const tag = makeTag(name, chips);
    tag.position.set(0, 1.55, 0);
    g.add(tag);

    // cards only for table bots
    let cards = null;
    if (withCards) {
      cards = makeHoleCards();
      cards.position.set(-0.13, 1.95, 0);
      g.add(cards);
    }

    g.userData = { pelvis, head, armL, armR, hipL, hipR, kneeL, kneeR, tag, cards, sit: 0 };
    setSitAmount(g, 0);

    return g;
  }

  function setSitAmount(av, amt01) {
    const u = av.userData;
    const t = clamp(amt01, 0, 1);
    u.sit = t;

    const hipBend  = lerp(0.0, -0.62, t);
    const kneeBend = lerp(0.0,  1.25, t);

    u.hipL.rotation.x = hipBend;
    u.hipR.rotation.x = hipBend;
    u.kneeL.rotation.x = kneeBend;
    u.kneeR.rotation.x = kneeBend;

    u.armL.rotation.x = lerp(-0.15, -0.55, t);
    u.armR.rotation.x = lerp(-0.15, -0.55, t);
  }

  function billboardToPlayer(obj) {
    if (!obj) return;
    const ref = cameraRef || playerRigRef;
    if (!ref) return;
    const p = ref.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function addSeatedBot(seatIndex, name, chips, suitColor, skinColor) {
    const seat = seats[seatIndex];
    if (!seat) return null;

    const bot = makeAvatar({ name, chips, suitColor, skinColor, withCards: true });
    bot.name = `SeatedBot_${seatIndex}`;

    // Place bot so pelvis lands on seat surface:
    // seat.position.y is world seat surface
    // pelvis baseline is PELVIS_BASE_Y * BOT_SCALE in world
    const pelvisWorldOffset = (PELVIS_BASE_Y * BOT_SCALE);
    bot.position.copy(seat.position);
    bot.position.y = seat.position.y - pelvisWorldOffset;

    bot.rotation.y = seat.yaw;
    setSitAmount(bot, 1);

    root.add(bot);
    state.bots.push(bot);
    state.seated.push(bot);
    return bot;
  }

  function addWalker(i) {
    const bot = makeAvatar({
      name: "LOBBY",
      chips: 0,
      suitColor: 0x1a1f2a,
      skinColor: 0xcfae8a,
      withCards: false
    });
    bot.name = `Walker_${i}`;
    bot.position.y = 0;

    setSitAmount(bot, 0);

    const w = {
      bot,
      baseAngle: (i / 12) * Math.PI * 2,
      radius: 6.4 + Math.random() * 1.4,
      speed: 0.22 + Math.random() * 0.24,
      phase: Math.random() * 10
    };

    root.add(bot);
    state.walkers.push(w);
    return w;
  }

  function addStaticBot(name, pos, yaw, suitColor, skinColor) {
    const bot = makeAvatar({ name, chips: 0, suitColor, skinColor, withCards: false });
    bot.name = name;
    bot.position.copy(pos);
    bot.rotation.y = yaw || 0;
    setSitAmount(bot, 0);
    root.add(bot);
    state.bots.push(bot);
    return bot;
  }

  return {
    init({ THREE: _THREE, scene, getSeats, getLobbyZone, tableFocus: _tf, metrics } = {}) {
      THREE = _THREE;
      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      lobbyZone = (typeof getLobbyZone === "function") ? (getLobbyZone() || null) : null;
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      if (metrics) state.metrics = metrics;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.bots.length = 0;
      state.seated.length = 0;
      state.walkers.length = 0;
      state.t = 0;

      // Mix of “male/female” via suit/skin differences (placeholder)
      addSeatedBot(1, "LUNA", 10000, 0x1a1f2a, 0xd6b48a);
      addSeatedBot(2, "JAX",  10000, 0x111318, 0xcfae8a);
      addSeatedBot(3, "NOVA", 10000, 0x22283a, 0xd8b59a);
      addSeatedBot(4, "RAVEN",10000, 0x151821, 0xcaa07e);
      addSeatedBot(5, "KAI",  10000, 0x0e1018, 0xd6b48a);

      // Walkers orbit around TABLE
      for (let i = 0; i < 12; i++) addWalker(i);

      // Guard near rail (static)
      addStaticBot(
        "GUARD",
        new THREE.Vector3(tableFocus.x + 4.6, 0, tableFocus.z + 1.0),
        Math.PI / 2,
        0x0e1320,
        0xcfae8a
      );

      // Mannequin near teleporter/spawn (static)
      addStaticBot(
        "MANNEQUIN",
        new THREE.Vector3(1.0, 0, 3.2),
        Math.PI,
        0x1b1c26,
        0xd6b48a
      );

      console.log("[Bots] init ✅ seated=" + state.seated.length + " walkers=" + state.walkers.length);
    },

    setPlayerRig(rig, cam) { playerRigRef = rig || null; cameraRef = cam || null; },

    update(dt) {
      if (!root) return;
      state.t += dt;

      // Walkers orbit around the table with gait
      for (const w of state.walkers) {
        const b = w.bot;
        const u = b.userData;
        const t = state.t + w.phase;

        const ang = w.baseAngle + t * w.speed;
        const x = tableFocus.x + Math.cos(ang) * w.radius;
        const z = tableFocus.z + Math.sin(ang) * w.radius;

        const dx = x - b.position.x;
        const dz = z - b.position.z;
        const d = Math.max(0.0001, Math.hypot(dx, dz));

        b.position.x += (dx / d) * 1.2 * dt;
        b.position.z += (dz / d) * 1.2 * dt;
        b.rotation.y = Math.atan2(dx, dz);

        // feet plant: keep them on floor (no float)
        b.position.y = 0;

        const gait = Math.sin(t * 6.2);
        const bend = Math.abs(gait) * 0.65;
        const swing = gait * 0.6;

        u.hipL.rotation.x = -0.15 - bend * 0.45;
        u.kneeL.rotation.x = 0.25 + bend * 0.90;
        u.hipR.rotation.x = -0.15 - (1 - bend) * 0.45;
        u.kneeR.rotation.x = 0.25 + (1 - bend) * 0.90;

        u.armL.rotation.x = -0.25 + swing;
        u.armR.rotation.x = -0.25 - swing;

        billboardToPlayer(u.tag);
      }

      // Seated bots: tiny breathe + cards hover
      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x;

        // breathe pelvis (very small)
        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.6) * 0.01;

        // subtle arm idle
        u.armL.rotation.z = 0.10 + Math.sin(t * 2.2) * 0.12;
        u.armR.rotation.z = -0.10 - Math.sin(t * 2.2) * 0.12;

        if (u.cards) {
          u.cards.position.y = 1.95 + Math.sin(t * 2.0) * 0.04;
          billboardToPlayer(u.cards);
        }

        billboardToPlayer(u.tag);
      }

      // Static bots: billboard tag
      for (const b of state.bots) {
        const u = b.userData;
        if (u?.tag) billboardToPlayer(u.tag);
      }
    }
  };
})();
