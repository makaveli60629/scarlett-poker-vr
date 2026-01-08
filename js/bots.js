// /js/bots.js — Scarlett Bots v2.0 (Sit Correctly + Tags + Walkers + Hover Cards)
// No external imports. world passes THREE + getSeats + getLobbyZone + metrics.

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

  function makeCanvasLabel(text) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, 40, 70, 432, 120, 28, true, false);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 130);

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

  function makeTag(text) {
    const tex = makeCanvasLabel(text);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), mat);
    mesh.name = "NameTag";
    return mesh;
  }

  function makeHoverCard() {
    const g = new THREE.Group();
    g.name = "HoverCards";

    const cardMatA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const cardMatB = new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.6, emissive: 0x220010, emissiveIntensity: 0.35 });

    const geo = new THREE.PlaneGeometry(0.18, 0.26);

    const a = new THREE.Mesh(geo, cardMatA);
    a.rotation.y = Math.PI;
    const b = new THREE.Mesh(geo, cardMatB);
    b.position.x = 0.20;

    g.add(a, b);
    return g;
  }

  function makeAvatar({ suitColor = 0x111318, skinColor = 0xd2b48c } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    // pelvis (root joint)
    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    g.add(pelvis);

    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 8, 16), suit);
    torso.position.y = 0.46;
    pelvis.add(torso);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), skin);
    head.position.y = 0.72;
    pelvis.add(head);

    // arms (with hands)
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.24, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.05, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.22, 0.58, 0.02);
    armR.position.set( 0.22, 0.58, 0.02);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit);
    upperL.position.y = -0.12;
    armL.add(upperL);

    const upperR = new THREE.Mesh(armGeo, suit);
    upperR.position.y = -0.12;
    armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit);
    const handR = new THREE.Mesh(handGeo, suit);
    handL.position.set(0, -0.28, 0.02);
    handR.position.set(0, -0.28, 0.02);
    armL.add(handL);
    armR.add(handR);

    // legs (thigh + shin) so sitting works
    const thighGeo = new THREE.CapsuleGeometry(0.06, 0.26, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.24, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.10, 0.05, 0.20);

    const legL = new THREE.Group(); legL.name = "legL";
    const legR = new THREE.Group(); legR.name = "legR";
    legL.position.set(-0.10, 0.18, 0);
    legR.position.set( 0.10, 0.18, 0);
    pelvis.add(legL, legR);

    const thighL = new THREE.Mesh(thighGeo, suit);
    const thighR = new THREE.Mesh(thighGeo, suit);
    thighL.position.y = -0.15;
    thighR.position.y = -0.15;
    legL.add(thighL);
    legR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL";
    const kneeR = new THREE.Group(); kneeR.name = "kneeR";
    kneeL.position.y = -0.30;
    kneeR.position.y = -0.30;
    legL.add(kneeL);
    legR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit);
    const shinR = new THREE.Mesh(shinGeo, suit);
    shinL.position.y = -0.14;
    shinR.position.y = -0.14;
    kneeL.add(shinL);
    kneeR.add(shinR);

    const footL = new THREE.Mesh(footGeo, suit);
    const footR = new THREE.Mesh(footGeo, suit);
    footL.position.set(0, -0.30, 0.08);
    footR.position.set(0, -0.30, 0.08);
    kneeL.add(footL);
    kneeR.add(footR);

    // name tag + hover cards
    const tag = makeTag("SCARLETT BOT");
    tag.position.set(0, 1.15, 0);
    g.add(tag);

    const cards = makeHoverCard();
    cards.position.set(0, 1.45, 0);
    g.add(cards);

    g.userData = { pelvis, head, armL, armR, legL, legR, kneeL, kneeR, tag, cards, sit: 0 };

    // default standing
    setSitAmount(g, 0);

    return g;
  }

  // seat alignment: put pelvis at seat surface and bend hips/knees so “butt” sits
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

    // arms swing slightly when sitting
    u.armL.rotation.x = lerp(-0.25, -0.55, t);
    u.armR.rotation.x = lerp(-0.25, -0.55, t);
  }

  function faceToward(av, target) {
    const p = av.position.clone();
    const t = target.clone();
    t.y = p.y;
    av.lookAt(t);
  }

  function addSeatedBot(seatIndex, name) {
    const seat = seats[seatIndex];
    if (!seat) return null;

    const bot = makeAvatar({ suitColor: 0x111318 });
    bot.name = `SeatedBot_${seatIndex}`;

    // root at seat position (world)
    bot.position.copy(seat.position);

    // seat yaw faces table
    bot.rotation.y = seat.yaw;

    // put pelvis at seat surface height (butt sits on seat)
    bot.userData.pelvis.position.y = 0.0; // pelvis joint local
    // The seat position already includes the seat surface Y (from anchor), so we do NOT add extra Y.
    setSitAmount(bot, 1);

    // name tag text
    bot.userData.tag.material.map = makeCanvasLabel(name);
    bot.userData.tag.material.map.needsUpdate = true;

    root.add(bot);
    state.bots.push(bot);
    return bot;
  }

  function addStandingBot(pos, name) {
    const bot = makeAvatar({ suitColor: 0x151821 });
    bot.name = `StandingBot_${name}`;
    bot.position.copy(pos);
    setSitAmount(bot, 0);

    bot.userData.tag.material.map = makeCanvasLabel(name);
    bot.userData.tag.material.map.needsUpdate = true;

    root.add(bot);
    state.bots.push(bot);
    return bot;
  }

  function addWalker(i, name) {
    const bot = makeAvatar({ suitColor: 0x1a1f2a });
    bot.name = `Walker_${i}`;
    setSitAmount(bot, 0);

    bot.userData.tag.material.map = makeCanvasLabel(name);
    bot.userData.tag.material.map.needsUpdate = true;

    // random start in lobby bounds
    const min = lobbyZone?.min || new THREE.Vector3(-6, 0, 6);
    const max = lobbyZone?.max || new THREE.Vector3(6, 0, 12);

    bot.position.set(
      lerp(min.x + 0.5, max.x - 0.5, Math.random()),
      0,
      lerp(min.z + 0.5, max.z - 0.5, Math.random())
    );

    const w = {
      bot,
      speed: 0.45 + Math.random() * 0.45,
      phase: Math.random() * 10,
      a: Math.random() * Math.PI * 2
    };

    root.add(bot);
    state.walkers.push(w);
    return w;
  }

  function billboardToPlayer(obj) {
    if (!playerRigRef) return;
    const p = playerRigRef.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  return {
    init({ THREE: _THREE, scene, getSeats, getLobbyZone, tableFocus: _tf, metrics, playerRig } = {}) {
      THREE = _THREE;
      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      lobbyZone = (typeof getLobbyZone === "function") ? getLobbyZone() : null;
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      if (metrics) state.metrics = metrics;
      if (playerRig) playerRigRef = playerRig;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.bots.length = 0;
      state.walkers.length = 0;

      // seated bots (leave seat 0 as "player seat")
      addSeatedBot(1, "BOT: LUNA");
      addSeatedBot(2, "BOT: JAX");
      addSeatedBot(3, "BOT: NOVA");

      // standing mannequin near teleporter (spawn)
      addStandingBot(new THREE.Vector3(0.95, 0, 3.6), "MANNEQUIN");

      // standing bot by table for scale check
      addStandingBot(new THREE.Vector3(tableFocus.x + 3.4, 0, tableFocus.z + 0.4), "SCALE BOT");

      // walkers
      for (let i = 0; i < 6; i++) addWalker(i, "LOBBY");

      console.log("[Bots] init ✅ seated=" + 3 + " walkers=" + state.walkers.length);
    },

    // allow world to pass player rig later
    setPlayerRig(rig) { playerRigRef = rig; },

    update(dt) {
      if (!root) return;
      state.t += dt;

      // walkers roam in lobby (simple loop)
      const min = lobbyZone?.min || new THREE.Vector3(-6, 0, 6);
      const max = lobbyZone?.max || new THREE.Vector3(6, 0, 12);

      for (const w of state.walkers) {
        const b = w.bot;
        const t = state.t + w.phase;

        // lissajous-ish wander
        const tx = lerp(min.x + 0.7, max.x - 0.7, 0.5 + Math.sin(t * 0.22 + w.a) * 0.5);
        const tz = lerp(min.z + 0.7, max.z - 0.7, 0.5 + Math.cos(t * 0.20 + w.a) * 0.5);

        const dx = tx - b.position.x;
        const dz = tz - b.position.z;
        const len = Math.max(0.0001, Math.hypot(dx, dz));

        b.position.x += (dx / len) * w.speed * dt;
        b.position.z += (dz / len) * w.speed * dt;

        b.rotation.y = Math.atan2(dx, dz);

        // arm swing (walking)
        const swing = Math.sin(t * 4.8) * 0.55;
        b.userData.armL.rotation.x = -0.25 + swing;
        b.userData.armR.rotation.x = -0.25 - swing;

        // gentle bob
        b.position.y = Math.sin(t * 3.0) * 0.01;

        // tag faces player
        billboardToPlayer(b.userData.tag);
        billboardToPlayer(b.userData.cards);
      }

      // seated + standing bots: idle + cards hover facing you
      for (const b of state.bots) {
        const u = b.userData;
        const t = state.t;

        // idle breathing
        u.pelvis.position.y = Math.sin(t * 1.6 + b.position.x) * 0.01;

        // hover cards above head and face player
        u.cards.position.y = 1.42 + Math.sin(t * 2.2 + b.position.z) * 0.03;
        billboardToPlayer(u.tag);
        billboardToPlayer(u.cards);

        // light hand motion for everyone
        const sw = Math.sin(t * 2.6 + b.position.x) * 0.15;
        u.armL.rotation.z = 0.15 + sw;
        u.armR.rotation.z = -0.15 - sw;
      }
    }
  };
})();
