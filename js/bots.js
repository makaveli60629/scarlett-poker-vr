// /js/bots.js — Scarlett Bots v2.1 (Floor-Aligned + Chips in Tag + Cards Visible)
// Fixes:
// - avatar geometry aligned: feet on Y=0
// - seated bots use seat surface properly (butt on seat)
// - name tag includes chips
// - cards above head visible and double-sided

export const Bots = (() => {
  let THREE = null;
  let root = null;

  let seats = [];
  let tableFocus = null;
  let lobbyZone = null;
  let playerRigRef = null;

  const state = {
    bots: [],
    walkers: [],
    t: 0,
    metrics: { tableY: 0.92, seatY: 0.52 }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // pelvis base height so feet land on Y=0
  const PELVIS_BASE_Y = 0.46;

  function makeCanvasTag(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    roundRect(ctx, 30, 50, 452, 156, 28, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 105);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 36px Arial";
    ctx.fillText("$" + Number(chips).toLocaleString(), 256, 160);

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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 0.30), mat);
    mesh.name = "NameTag";
    mesh.userData.set = (n, c) => {
      mesh.material.map = makeCanvasTag(n, c);
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    };
    return mesh;
  }

  function makeHoverCards() {
    const g = new THREE.Group();
    g.name = "HoverCards";

    const geo = new THREE.PlaneGeometry(0.22, 0.30);
    const matA = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide
    });
    const matB = new THREE.MeshStandardMaterial({
      color: 0xff2d7a,
      roughness: 0.55,
      emissive: 0x220010,
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide
    });

    const a = new THREE.Mesh(geo, matA);
    const b = new THREE.Mesh(geo, matB);
    b.position.x = 0.26;

    g.add(a, b);
    return g;
  }

  function makeAvatar({ suitColor = 0x111318, skinColor = 0xd2b48c, name = "BOT", chips = 10000 } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    // pelvis joint
    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y; // ✅ anchors feet to floor
    g.add(pelvis);

    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 8, 16), suit);
    torso.position.y = 0.46;
    pelvis.add(torso);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), skin);
    head.position.y = 0.72;
    pelvis.add(head);

    // arms + hands
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.24, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.05, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.22, 0.58, 0.02);
    armR.position.set( 0.22, 0.58, 0.02);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit); upperL.position.y = -0.12; armL.add(upperL);
    const upperR = new THREE.Mesh(armGeo, suit); upperR.position.y = -0.12; armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.28, 0.02); armL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.28, 0.02); armR.add(handR);

    // legs
    const thighGeo = new THREE.CapsuleGeometry(0.06, 0.26, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.24, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.10, 0.05, 0.20);

    const legL = new THREE.Group(); legL.name = "legL";
    const legR = new THREE.Group(); legR.name = "legR";
    legL.position.set(-0.10, 0.18, 0);
    legR.position.set( 0.10, 0.18, 0);
    pelvis.add(legL, legR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.15; legL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.15; legR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.30; legL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.30; legR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.14; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.14; kneeR.add(shinR);

    const footL = new THREE.Mesh(footGeo, suit); footL.position.set(0, -0.30, 0.08); kneeL.add(footL);
    const footR = new THREE.Mesh(footGeo, suit); footR.position.set(0, -0.30, 0.08); kneeR.add(footR);

    // tags + cards (higher so you definitely see them)
    const tag = makeTag(name, chips);
    tag.position.set(0, 1.25, 0);
    g.add(tag);

    const cards = makeHoverCards();
    cards.position.set(-0.13, 1.65, 0);
    g.add(cards);

    g.userData = { pelvis, head, armL, armR, legL, legR, kneeL, kneeR, tag, cards, sit: 0 };
    setSitAmount(g, 0);
    return g;
  }

  function setSitAmount(av, amt01) {
    const u = av.userData;
    const t = clamp(amt01, 0, 1);
    u.sit = t;

    const hipBend  = lerp(0.0, -0.60, t);
    const kneeBend = lerp(0.0,  1.25, t);

    u.legL.rotation.x = hipBend;
    u.legR.rotation.x = hipBend;
    u.kneeL.rotation.x = kneeBend;
    u.kneeR.rotation.x = kneeBend;

    u.armL.rotation.x = lerp(-0.20, -0.55, t);
    u.armR.rotation.x = lerp(-0.20, -0.55, t);
  }

  function billboardToPlayer(obj) {
    if (!playerRigRef) return;
    const p = playerRigRef.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function addSeatedBot(seatIndex, name, chips) {
    const seat = seats[seatIndex];
    if (!seat) return null;

    const bot = makeAvatar({ name, chips, suitColor: 0x111318 });
    bot.name = `SeatedBot_${seatIndex}`;

    // seat.position is world position at seat surface
    bot.position.copy(seat.position);

    // We want pelvis world Y to equal seat surface Y
    // pelvis local y is PELVIS_BASE_Y, so shift root down by that much:
    bot.position.y = seat.position.y - PELVIS_BASE_Y;

    bot.rotation.y = seat.yaw;
    setSitAmount(bot, 1);

    root.add(bot);
    state.bots.push(bot);
    return bot;
  }

  function addStandingBot(pos, name, chips) {
    const bot = makeAvatar({ name, chips, suitColor: 0x151821 });
    bot.name = `StandingBot_${name}`;
    bot.position.copy(pos);
    // Standing: root on floor so pelvis sits at PELVIS_BASE_Y
    bot.position.y = 0;
    setSitAmount(bot, 0);
    root.add(bot);
    state.bots.push(bot);
    return bot;
  }

  function addWalker(i, name, chips) {
    const bot = makeAvatar({ name, chips, suitColor: 0x1a1f2a });
    bot.name = `Walker_${i}`;
    bot.position.y = 0;
    setSitAmount(bot, 0);

    const min = lobbyZone?.min || new THREE.Vector3(-6, 0, 6);
    const max = lobbyZone?.max || new THREE.Vector3(6, 0, 12);
    bot.position.set(
      lerp(min.x + 0.7, max.x - 0.7, Math.random()),
      0,
      lerp(min.z + 0.7, max.z - 0.7, Math.random())
    );

    const w = { bot, speed: 0.55 + Math.random() * 0.55, phase: Math.random() * 10, a: Math.random() * Math.PI * 2 };
    root.add(bot);
    state.walkers.push(w);
    return w;
  }

  return {
    init({ THREE: _THREE, scene, getSeats, getLobbyZone, tableFocus: _tf, metrics } = {}) {
      THREE = _THREE;
      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      lobbyZone = (typeof getLobbyZone === "function") ? getLobbyZone() : null;
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      if (metrics) state.metrics = metrics;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.bots.length = 0;
      state.walkers.length = 0;

      // seated bots
      addSeatedBot(1, "LUNA", 10000);
      addSeatedBot(2, "JAX", 10000);
      addSeatedBot(3, "NOVA", 10000);

      // mannequin near spawn/teleporter
      addStandingBot(new THREE.Vector3(0.95, 0, 3.6), "MANNEQUIN", 0);

      // standing scale bot by table
      addStandingBot(new THREE.Vector3(tableFocus.x + 3.4, 0, tableFocus.z + 0.4), "SCALE", 0);

      // walkers
      for (let i = 0; i < 8; i++) addWalker(i, "LOBBY", 0);

      console.log("[Bots] init ✅ seated=3 walkers=" + state.walkers.length);
    },

    setPlayerRig(rig) { playerRigRef = rig; },

    update(dt) {
      if (!root) return;
      state.t += dt;

      const min = lobbyZone?.min || new THREE.Vector3(-6, 0, 6);
      const max = lobbyZone?.max || new THREE.Vector3(6, 0, 12);

      // walkers
      for (const w of state.walkers) {
        const b = w.bot;
        const t = state.t + w.phase;

        const tx = lerp(min.x + 0.7, max.x - 0.7, 0.5 + Math.sin(t * 0.22 + w.a) * 0.5);
        const tz = lerp(min.z + 0.7, max.z - 0.7, 0.5 + Math.cos(t * 0.20 + w.a) * 0.5);

        const dx = tx - b.position.x;
        const dz = tz - b.position.z;
        const len = Math.max(0.0001, Math.hypot(dx, dz));

        b.position.x += (dx / len) * w.speed * dt;
        b.position.z += (dz / len) * w.speed * dt;
        b.rotation.y = Math.atan2(dx, dz);

        // swing
        const swing = Math.sin(t * 5.0) * 0.55;
        b.userData.armL.rotation.x = -0.25 + swing;
        b.userData.armR.rotation.x = -0.25 - swing;

        // tiny bob
        b.position.y = Math.sin(t * 3.0) * 0.01;

        billboardToPlayer(b.userData.tag);
        billboardToPlayer(b.userData.cards);
      }

      // seated + standing bots
      for (const b of state.bots) {
        const u = b.userData;
        const t = state.t;

        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.6 + b.position.x) * 0.01;
        u.cards.position.y = 1.65 + Math.sin(t * 2.2 + b.position.z) * 0.04;

        const sw = Math.sin(t * 2.6 + b.position.x) * 0.15;
        u.armL.rotation.z = 0.15 + sw;
        u.armR.rotation.z = -0.15 - sw;

        billboardToPlayer(u.tag);
        billboardToPlayer(u.cards);
      }
    }
  };
})();
