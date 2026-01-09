// /js/bots.js — Scarlett Bots v2.5 (NEVER THROWS, PLAYER AVOID, RAIL AVOID)
// Exports: Bots
// - Seated bots only on seats (if seats exist)
// - Lobby walkers wander near table, not into rails or player
// - Never throws if seats/tableFocus missing or init timing issues

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let sceneRef = null;

  let seats = [];
  let tableFocus = null;
  let metrics = { tableY: 0.92, seatY: 0.52 };

  let playerRig = null;
  let cameraRef = null;

  const state = {
    t: 0,
    seated: [],
    walkers: [],
    bots: [],
    inited: false,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PELVIS_BASE_Y = 0.46;

  function safeTableFocus() {
    // ✅ NEVER allow undefined tableFocus
    if (!tableFocus || typeof tableFocus.x !== "number") {
      tableFocus = new THREE.Vector3(0, 0, -6.5);
    }
    return tableFocus;
  }

  function cardTexture(rank, suit) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 356;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 6;
    ctx.strokeRect(6,6,c.width-12,c.height-12);

    const isRed = (suit === "♥" || suit === "♦");
    ctx.fillStyle = isRed ? "#b6001b" : "#111";

    ctx.font = "bold 62px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, 18, 12);
    ctx.font = "bold 66px Arial";
    ctx.fillText(suit, 18, 78);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 62px Arial";
    ctx.fillText(rank, c.width - 18, c.height - 80);
    ctx.font = "bold 66px Arial";
    ctx.fillText(suit, c.width - 18, c.height - 14);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 150px Arial";
    ctx.fillText(suit, c.width/2, c.height/2 + 12);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeHoleCards() {
    const g = new THREE.Group();
    g.name = "HoleCards";
    const geo = new THREE.PlaneGeometry(0.24, 0.34); // ✅ bigger

    const defs = [
      { r: "A", s: "♠" },
      { r: "K", s: "♦" },
    ];

    defs.forEach((cs, i) => {
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

      face.polygonOffset = true; face.polygonOffsetFactor = -2; face.polygonOffsetUnits = -2;
      back.polygonOffset = true; back.polygonOffsetFactor = -2; back.polygonOffsetUnits = -2;

      const card = new THREE.Group();
      const faceM = new THREE.Mesh(geo, face);
      const backM = new THREE.Mesh(geo, back);

      faceM.position.z = 0.002;
      backM.position.z = -0.002;
      backM.rotation.y = Math.PI;

      card.add(faceM, backM);
      card.position.x = i * 0.28;
      card.renderOrder = 10;
      g.add(card);
    });

    return g;
  }

  function makeCanvasTag(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(0,0,0,0.62)";
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
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.36), mat);
    mesh.name = "NameTag";
    mesh.renderOrder = 50;
    return mesh;
  }

  function makeAvatar({ suitColor=0x111318, skinColor=0xd2b48c, name="BOT", chips=10000, withCards=false } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y;
    g.add(pelvis);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.46, 8, 16), suit);
    torso.position.y = 0.56;
    pelvis.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
    head.position.y = 0.90; // ✅ higher
    pelvis.add(head);

    // arms + hands
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.24, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.05, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.23, 0.68, 0.03);
    armR.position.set( 0.23, 0.68, 0.03);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit); upperL.position.y = -0.12; armL.add(upperL);
    const upperR = new THREE.Mesh(armGeo, suit); upperR.position.y = -0.12; armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.28, 0.02); armL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.28, 0.02); armR.add(handR);

    // legs
    const thighGeo = new THREE.CapsuleGeometry(0.06, 0.26, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.24, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.11, 0.05, 0.22);

    const hipL = new THREE.Group(); hipL.name = "hipL";
    const hipR = new THREE.Group(); hipR.name = "hipR";
    hipL.position.set(-0.10, 0.22, 0);
    hipR.position.set( 0.10, 0.22, 0);
    pelvis.add(hipL, hipR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.15; hipL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.15; hipR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.30; hipL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.30; hipR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.14; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.14; kneeR.add(shinR);

    const footL = new THREE.Mesh(footGeo, suit); footL.position.set(0, -0.30, 0.08); kneeL.add(footL);
    const footR = new THREE.Mesh(footGeo, suit); footR.position.set(0, -0.30, 0.08); kneeR.add(footR);

    const tag = makeTag(name, chips);
    tag.position.set(0, 1.85, 0); // ✅ tags higher
    g.add(tag);

    let cards = null;
    if (withCards) {
      cards = makeHoleCards();
      cards.position.set(-0.14, 2.10, 0); // ✅ higher
      g.add(cards);
    }

    g.userData = { pelvis, head, armL, armR, hipL, hipR, kneeL, kneeR, tag, cards };
    return g;
  }

  function billboardToPlayer(obj) {
    if (!obj) return;
    const ref = cameraRef || playerRig;
    if (!ref || !ref.position) return;
    const p = ref.position;
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function addSeatedBot(seatIndex, name, chips) {
    const seat = seats[seatIndex];
    if (!seat || !seat.anchor) return null;

    const bot = makeAvatar({ name, chips, suitColor: 0x121826, withCards: true });
    bot.name = `SeatedBot_${seatIndex}`;

    const wp = new THREE.Vector3();
    seat.anchor.getWorldPosition(wp);

    bot.position.copy(wp);
    bot.position.y -= PELVIS_BASE_Y;
    bot.rotation.y = seat.yaw || 0;

    root.add(bot);
    state.bots.push(bot);
    state.seated.push(bot);
    return bot;
  }

  function addWalker(i) {
    const tf = safeTableFocus();
    const bot = makeAvatar({ name: "LOBBY", chips: 0, suitColor: 0x1a1f2a, withCards: false });
    bot.name = `Walker_${i}`;
    bot.position.y = 0;

    const w = {
      bot,
      target: new THREE.Vector3(
        tf.x + (Math.random()-0.5)*12,
        0,
        tf.z + (Math.random()-0.5)*10
      ),
      speed: 0.55 + Math.random()*0.35,
      phase: Math.random()*10
    };

    root.add(bot);
    state.walkers.push(w);
    state.bots.push(bot);
    return w;
  }

  function pickNewTarget(w) {
    const tf = safeTableFocus();
    w.target.set(
      tf.x + (Math.random()-0.5)*12,
      0,
      tf.z + (Math.random()-0.5)*10
    );
  }

  function avoidPoint(pos, p, radius) {
    if (!p) return;
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.0001) return;
    if (d < radius) {
      const push = (radius - d) * 0.9;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    }
  }

  function separateBots(bots, minDist = 0.55) {
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const a = bots[i].position, b = bots[j].position;
        const dx = a.x - b.x, dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.0001 && d < minDist) {
          const push = (minDist - d) * 0.5;
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          b.x -= (dx / d) * push;
          b.z -= (dz / d) * push;
        }
      }
    }
  }

  return {
    init({ THREE: _THREE, scene, getSeats, tableFocus: _tf, metrics: _m } = {}) {
      THREE = _THREE;
      sceneRef = scene;

      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      tableFocus = (_tf && typeof _tf.x === "number") ? _tf : new THREE.Vector3(0,0,-6.5);
      if (_m) metrics = _m;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.t = 0;
      state.bots.length = 0;
      state.seated.length = 0;
      state.walkers.length = 0;
      state.inited = true;

      if (seats.length) {
        addSeatedBot(1, "LUNA", 10000);
        addSeatedBot(2, "JAX", 10000);
        addSeatedBot(3, "NOVA", 10000);
        addSeatedBot(4, "RAVEN", 10000);
        addSeatedBot(5, "KAI", 10000);
      }

      for (let i = 0; i < 10; i++) addWalker(i);

      console.log("[Bots] init ✅ seated=" + state.seated.length + " walkers=" + state.walkers.length);
    },

    setPlayerRig(rig, cam) { playerRig = rig || null; cameraRef = cam || null; },

    update(dt) {
      // ✅ if called before init, just bail safely
      if (!root || !THREE) return;
      if (!state.inited) return;

      state.t += dt;
      const tf = safeTableFocus();

      // wanderers
      for (const w of state.walkers) {
        const b = w.bot;
        const u = b.userData;
        const t = state.t + w.phase;

        // new target
        const dxT = w.target.x - b.position.x;
        const dzT = w.target.z - b.position.z;
        if (Math.hypot(dxT, dzT) < 0.35) pickNewTarget(w);

        // move
        const dx = w.target.x - b.position.x;
        const dz = w.target.z - b.position.z;
        const d = Math.max(0.0001, Math.hypot(dx, dz));

        b.position.x += (dx / d) * w.speed * dt;
        b.position.z += (dz / d) * w.speed * dt;
        b.rotation.y = Math.atan2(dx, dz);

        // rail avoidance
        const rx = b.position.x - tf.x;
        const rz = b.position.z - tf.z;
        const rd = Math.hypot(rx, rz);
        const railR = 3.85;
        if (rd < railR) {
          const push = (railR - rd) * 1.2;
          b.position.x += (rx / Math.max(0.0001, rd)) * push;
          b.position.z += (rz / Math.max(0.0001, rd)) * push;
        }

        // avoid player
        if (playerRig) avoidPoint(b.position, playerRig.position, 1.25);

        // gait
        const gait = Math.sin(t * 6.0);
        const bend = Math.abs(gait) * 0.65;
        const swing = gait * 0.6;

        u.hipL.rotation.x = -0.15 - bend * 0.45;
        u.kneeL.rotation.x = 0.25 + bend * 0.90;
        u.hipR.rotation.x = -0.15 - (1 - bend) * 0.45;
        u.kneeR.rotation.x = 0.25 + (1 - bend) * 0.90;

        u.armL.rotation.x = -0.25 + swing;
        u.armR.rotation.x = -0.25 - swing;

        b.position.y = Math.sin(t * 3.0) * 0.01;

        billboardToPlayer(u.tag);
      }

      separateBots(state.walkers.map(w => w.bot), 0.60);

      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x;

        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.6) * 0.01;
        u.armL.rotation.z = 0.10 + Math.sin(t * 2.2) * 0.12;
        u.armR.rotation.z = -0.10 - Math.sin(t * 2.2) * 0.12;

        if (u.cards) {
          u.cards.position.y = 2.10 + Math.sin(t * 2.0) * 0.035;
          billboardToPlayer(u.cards);
        }
        billboardToPlayer(u.tag);
      }
    }
  };
})();
