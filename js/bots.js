// /js/bots.js — Scarlett Bots v3.0 (Solid, No CDN imports)
// - Seated bots sit correctly on seat surface
// - Walkers orbit around table, not walls
// - Better gait + hands + height similar to player

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let seats = [];
  let tableFocus = null;

  const state = {
    seated: [],
    walkers: [],
    t: 0,
    metrics: { tableY: 0.92, seatY: 0.52 }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // pelvis base so feet land on y=0
  const PELVIS_BASE_Y = 0.48;

  function makeTagTexture(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);

    // bg
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    roundRect(ctx, 28, 36, 456, 184, 26, true);

    // name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 105);

    // chips (smaller tag strip)
    ctx.fillStyle = "rgba(127,231,255,0.18)";
    roundRect(ctx, 120, 150, 272, 58, 18, true);
    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 34px Arial";
    ctx.fillText("$" + Number(chips).toLocaleString(), 256, 180);

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
    const tex = makeTagTexture(name, chips);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.35), mat);
    mesh.name = "NameTag";
    mesh.userData.set = (n, c) => {
      mesh.material.map = makeTagTexture(n, c);
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    };
    return mesh;
  }

  function makeAvatar({ suitColor = 0x111318, skinColor = 0xd2b48c, name = "BOT", chips = 10000 } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    // scale up so they match player height better
    g.scale.setScalar(1.15);

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.72, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y;
    g.add(pelvis);

    // torso + jacket
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.46, 8, 16), suit);
    torso.position.y = 0.54;
    pelvis.add(torso);

    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.24), suit);
    jacket.position.set(0, 0.54, 0.01);
    pelvis.add(jacket);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
    head.position.y = 0.86;
    pelvis.add(head);

    // arms + hands
    const armGeo = new THREE.CapsuleGeometry(0.05, 0.26, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.055, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.25, 0.70, 0.03);
    armR.position.set( 0.25, 0.70, 0.03);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit); upperL.position.y = -0.13; armL.add(upperL);
    const upperR = new THREE.Mesh(armGeo, suit); upperR.position.y = -0.13; armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.30, 0.02); armL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.30, 0.02); armR.add(handR);

    // legs (hip -> knee -> foot)
    const thighGeo = new THREE.CapsuleGeometry(0.065, 0.28, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.058, 0.26, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.12, 0.05, 0.24);

    const hipL = new THREE.Group(); hipL.name = "hipL";
    const hipR = new THREE.Group(); hipR.name = "hipR";
    hipL.position.set(-0.11, 0.22, 0);
    hipR.position.set( 0.11, 0.22, 0);
    pelvis.add(hipL, hipR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.16; hipL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.16; hipR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.32; hipL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.32; hipR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.15; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.15; kneeR.add(shinR);

    const footL = new THREE.Mesh(footGeo, suit); footL.position.set(0, -0.32, 0.09); kneeL.add(footL);
    const footR = new THREE.Mesh(footGeo, suit); footR.position.set(0, -0.32, 0.09); kneeR.add(footR);

    // tag
    const tag = makeTag(name, chips);
    tag.position.set(0, 1.55, 0);
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
    const kneeBend = lerp(0.0,  1.20, t);

    u.hipL.rotation.x = hipBend;
    u.hipR.rotation.x = hipBend;
    u.kneeL.rotation.x = kneeBend;
    u.kneeR.rotation.x = kneeBend;

    u.armL.rotation.x = lerp(-0.15, -0.55, t);
    u.armR.rotation.x = lerp(-0.15, -0.55, t);
  }

  function addSeatedBot(seatIndex, name, chips, suitColor) {
    const seat = seats[seatIndex];
    if (!seat) return null;

    const bot = makeAvatar({ name, chips, suitColor });
    bot.name = `SeatedBot_${seatIndex}`;

    // place so pelvis lands on seat surface
    bot.position.copy(seat.position);
    bot.position.y = seat.position.y - (PELVIS_BASE_Y * bot.scale.y);
    bot.rotation.y = seat.yaw;

    setSitAmount(bot, 1);

    root.add(bot);
    state.seated.push(bot);
    return bot;
  }

  function addWalker(i) {
    const bot = makeAvatar({ name: "OBSERVER", chips: 0, suitColor: 0x1a1f2a });
    bot.name = `Walker_${i}`;
    bot.position.y = 0;
    setSitAmount(bot, 0);

    const w = {
      bot,
      baseAngle: (i / 10) * Math.PI * 2,
      radius: 5.2 + Math.random() * 1.2,
      speed: 0.30 + Math.random() * 0.25,
      phase: Math.random() * 10
    };

    root.add(bot);
    state.walkers.push(w);
    return w;
  }

  function billboardFlat(obj, targetPos) {
    if (!obj || !targetPos) return;
    obj.lookAt(targetPos.x, obj.position.y, targetPos.z);
  }

  return {
    init({ THREE: _THREE, scene, getSeats, tableFocus: _tf, metrics } = {}) {
      THREE = _THREE;
      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      if (metrics) state.metrics = metrics;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.seated.length = 0;
      state.walkers.length = 0;
      state.t = 0;

      // Seated/table bots (5 bots, seat 0 reserved for player)
      addSeatedBot(1, "LUNA", 10000, 0x111318);
      addSeatedBot(2, "JAX", 10000, 0x1c222d);
      addSeatedBot(3, "NOVA", 10000, 0x15151c);
      addSeatedBot(4, "RAVEN", 10000, 0x101621);
      addSeatedBot(5, "KAI",  10000, 0x20262f);

      // Walkers orbit around table
      for (let i = 0; i < 10; i++) addWalker(i);

      console.log("[Bots] init ✅ seated=" + state.seated.length + " walkers=" + state.walkers.length);
    },

    update(dt) {
      if (!root) return;
      state.t += dt;

      // use camera if present, otherwise table focus
      const cam = root.parent?.getObjectByName?.("PlayerRig")?.children?.[0] || null;
      const target = cam ? cam.getWorldPosition(new THREE.Vector3()) : tableFocus.clone();

      // walkers orbit
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

        b.position.x += (dx / d) * 1.25 * dt;
        b.position.z += (dz / d) * 1.25 * dt;
        b.rotation.y = Math.atan2(dx, dz);
        b.position.y = Math.sin(t * 3.0) * 0.01;

        const gait = Math.sin(t * 6.0);
        const bend = Math.abs(gait);
        const swing = gait * 0.55;

        u.hipL.rotation.x = -0.12 - bend * 0.45;
        u.kneeL.rotation.x = 0.25 + bend * 0.90;
        u.hipR.rotation.x = -0.12 - (1 - bend) * 0.45;
        u.kneeR.rotation.x = 0.25 + (1 - bend) * 0.90;

        u.armL.rotation.x = -0.25 + swing;
        u.armR.rotation.x = -0.25 - swing;

        billboardFlat(u.tag, target);
      }

      // seated idle
      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x;

        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.6) * 0.01;
        u.armL.rotation.z = 0.10 + Math.sin(t * 2.2) * 0.12;
        u.armR.rotation.z = -0.10 - Math.sin(t * 2.2) * 0.12;

        billboardFlat(u.tag, target);
      }
    }
  };
})();
