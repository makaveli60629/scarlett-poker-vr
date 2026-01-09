// /js/bots.js — Scarlett Bots v3.0 (FULL, DROP-IN, GitHub Pages SAFE)
// Exports: Bots
//
// Goals (v3.0):
// - No “pill bot”: consistent low-poly humanoid silhouette (head/neck/torso/pelvis/shoulders/elbows/hands/legs/shoes)
// - Seated bots sit ON the seat anchor (pelvis aligned), feet land on floor (no floating)
// - Walkers wander naturally (not herd), avoid player, avoid each other, avoid rail/table radius
// - Lobby tags only show when you look at them; table tags always show
// - Only table bots get hole cards; cards face the player (billboard), no duplicates (simple shuffled deck)
// - Never throws if seats missing / partial world data
//
// Usage (world.js):
//   await Bots.init({ THREE, scene, getSeats:()=>world.seats, tableFocus:world.tableFocus, getLobbyZone:()=>world.lobbyZone, railRadius:3.85 });
//   Bots.setPlayerRig(playerRig, camera);
//   Bots.update(dt);

export const Bots = (() => {
  let THREE = null;
  let root = null;
  let sceneRef = null;

  let seats = [];
  let tableFocus = null;
  let getLobbyZone = null;
  let railRadius = 3.85;

  let playerRig = null;
  let cameraRef = null;

  const state = {
    t: 0,
    bots: [],
    seated: [],
    walkers: [],
    rngSeed: 12345
  };

  // ---- helpers ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function safeLog(...a) { try { console.log(...a); } catch {} }

  function rand01() {
    // deterministic-ish LCG (stable enough for repeatable)
    state.rngSeed = (state.rngSeed * 1664525 + 1013904223) >>> 0;
    return (state.rngSeed & 0xffffff) / 0x1000000;
  }
  function randRange(a, b) { return a + (b - a) * rand01(); }

  function v3(x=0,y=0,z=0){ return new THREE.Vector3(x,y,z); }

  function worldPosOf(obj) {
    const p = new THREE.Vector3();
    try { obj.getWorldPosition(p); } catch {}
    return p;
  }

  function yawToward(fromPos, toPos) {
    const dx = toPos.x - fromPos.x;
    const dz = toPos.z - fromPos.z;
    return Math.atan2(dx, dz);
  }

  function billboardToCamera(obj) {
    if (!obj) return;
    const cam = cameraRef || playerRig;
    if (!cam) return;
    const p = new THREE.Vector3();
    cam.getWorldPosition(p);
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function cameraForward() {
    const cam = cameraRef;
    if (!cam) return null;
    const f = new THREE.Vector3(0,0,-1);
    try { cam.getWorldQuaternion(_tmpQ); f.applyQuaternion(_tmpQ).normalize(); } catch {}
    return f;
  }

  // ---- deck / card textures (bigger corner ranks) ----
  function makeDeck() {
    const suits = ["♠","♥","♦","♣"];
    const ranks = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
    const d = [];
    for (const s of suits) for (const r of ranks) d.push({ r, s });
    // shuffle
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rand01() * (i + 1));
      const tmp = d[i]; d[i] = d[j]; d[j] = tmp;
    }
    return d;
  }

  function cardFaceTexture(rank, suit) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 716;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#fbfbfb";
    ctx.fillRect(0,0,c.width,c.height);

    // border
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 12;
    ctx.strokeRect(12,12,c.width-24,c.height-24);

    const red = (suit === "♥" || suit === "♦");
    ctx.fillStyle = red ? "#b1001a" : "#141414";

    // BIG corners
    ctx.font = "900 108px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, 34, 24);

    ctx.font = "900 116px Arial";
    ctx.fillText(suit, 34, 140);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "900 108px Arial";
    ctx.fillText(rank, c.width - 34, c.height - 140);

    ctx.font = "900 116px Arial";
    ctx.fillText(suit, c.width - 34, c.height - 24);

    // center suit
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 280px Arial";
    ctx.fillText(suit, c.width/2, c.height/2 + 12);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeHoleCards(cardA, cardB) {
    const g = new THREE.Group();
    g.name = "HoleCards";

    const geo = new THREE.PlaneGeometry(0.22, 0.31);

    function makeCardMesh(cs, i) {
      const faceMat = new THREE.MeshStandardMaterial({
        map: cardFaceTexture(cs.r, cs.s),
        roughness: 0.55,
        metalness: 0.0,
        emissive: 0x050505,
        emissiveIntensity: 0.18,
        side: THREE.DoubleSide
      });
      const backMat = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.55,
        emissive: 0x220010,
        emissiveIntensity: 0.45,
        side: THREE.DoubleSide
      });

      // reduce z-fighting/flicker
      faceMat.polygonOffset = true; faceMat.polygonOffsetFactor = -2; faceMat.polygonOffsetUnits = -2;
      backMat.polygonOffset = true; backMat.polygonOffsetFactor = -2; backMat.polygonOffsetUnits = -2;

      const card = new THREE.Group();
      const face = new THREE.Mesh(geo, faceMat);
      const back = new THREE.Mesh(geo, backMat);

      face.position.z = 0.002;
      back.position.z = -0.002;
      back.rotation.y = Math.PI;

      card.add(face, back);
      card.position.x = i === 0 ? -0.13 : 0.13;
      card.renderOrder = 20;
      return card;
    }

    g.add(makeCardMesh(cardA, 0));
    g.add(makeCardMesh(cardB, 1));
    return g;
  }

  // ---- tags (table always on, lobby gaze-based) ----
  function makeTagTexture(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.clearRect(0,0,c.width,c.height);
    // bg
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    roundRect(ctx, 28, 44, 456, 168, 30, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 108);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "900 38px Arial";
    ctx.fillText("$" + Number(chips).toLocaleString(), 256, 164);

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
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.34), mat);
    mesh.name = "NameTag";
    mesh.renderOrder = 60;
    mesh.userData.set = (n, c) => {
      try {
        mesh.material.map = makeTagTexture(n, c);
        mesh.material.map.needsUpdate = true;
        mesh.material.needsUpdate = true;
      } catch {}
    };
    return mesh;
  }

  // ---- humanoid mesh (low-poly, “real-ish”) ----
  // Anchor rule: feet should land on y=0 when avatar group y=0.
  // We'll keep a “pelvis base” at a fixed local y.
  const PELVIS_BASE_Y = 0.96; // taller, more human-scale
  const HUMAN_SCALE = 1.12;   // bring bots closer to player height

  function makeHumanoid({ gender="m", suitColor=0x111318, skinColor=0xd2b48c, name="BOT", chips=10000, withCards=false, cards=null } = {}) {
    const g = new THREE.Group();
    g.name = "BotHumanoid";

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.8, metalness: 0.06 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65, metalness: 0.0 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.75, metalness: 0.05 });

    // pelvis root
    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y;
    g.add(pelvis);

    // proportions
    const shoulderW = gender === "f" ? 0.30 : 0.34;
    const hipW = gender === "f" ? 0.22 : 0.26;
    const torsoH = gender === "f" ? 0.46 : 0.50;

    // hips block (helps non-pill look)
    const hips = new THREE.Mesh(new THREE.BoxGeometry(hipW, 0.18, 0.18), suit);
    hips.position.y = 0.05;
    pelvis.add(hips);

    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, torsoH, 8, 14), suit);
    torso.position.y = 0.42;
    pelvis.add(torso);

    // shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(shoulderW, 0.14, 0.22), suit);
    shoulders.position.y = 0.64;
    pelvis.add(shoulders);

    // neck + head (face-ish)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.10, 10), skin);
    neck.position.y = 0.78;
    pelvis.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 14), skin);
    head.position.y = 0.92;
    pelvis.add(head);

    // simple face plate
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.15), new THREE.MeshStandardMaterial({
      color: 0xf4d7c7,
      roughness: 0.7,
      metalness: 0.0,
      emissive: 0x000000
    }));
    face.position.set(0, 0.92, 0.135);
    pelvis.add(face);

    // arms with elbows + hands
    const upperArmGeo = new THREE.CapsuleGeometry(0.045, 0.22, 8, 12);
    const foreArmGeo  = new THREE.CapsuleGeometry(0.040, 0.20, 8, 12);
    const handGeo     = new THREE.BoxGeometry(0.075, 0.045, 0.11);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-shoulderW/2 - 0.03, 0.64, 0.02);
    armR.position.set( shoulderW/2 + 0.03, 0.64, 0.02);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(upperArmGeo, suit); upperL.position.y = -0.12; armL.add(upperL);
    const upperR = new THREE.Mesh(upperArmGeo, suit); upperR.position.y = -0.12; armR.add(upperR);

    const elbowL = new THREE.Group(); elbowL.name = "elbowL"; elbowL.position.y = -0.26; armL.add(elbowL);
    const elbowR = new THREE.Group(); elbowR.name = "elbowR"; elbowR.position.y = -0.26; armR.add(elbowR);

    const foreL = new THREE.Mesh(foreArmGeo, suit); foreL.position.y = -0.10; elbowL.add(foreL);
    const foreR = new THREE.Mesh(foreArmGeo, suit); foreR.position.y = -0.10; elbowR.add(foreR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.23, 0.02); elbowL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.23, 0.02); elbowR.add(handR);

    // legs with knees + shoes
    const thighGeo = new THREE.CapsuleGeometry(0.065, 0.28, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.060, 0.26, 8, 14);
    const shoeGeo  = new THREE.BoxGeometry(0.14, 0.06, 0.26);

    const hipL = new THREE.Group(); hipL.name = "hipL";
    const hipR = new THREE.Group(); hipR.name = "hipR";
    hipL.position.set(-hipW/2 + 0.05, 0.02, 0.0);
    hipR.position.set( hipW/2 - 0.05, 0.02, 0.0);
    pelvis.add(hipL, hipR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.16; hipL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.16; hipR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.34; hipL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.34; hipR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.14; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.14; kneeR.add(shinR);

    const shoeL = new THREE.Mesh(shoeGeo, shoe); shoeL.position.set(0, -0.30, 0.10); kneeL.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoe); shoeR.position.set(0, -0.30, 0.10); kneeR.add(shoeR);

    // tag
    const tag = makeTag(name, chips);
    tag.position.set(0, 2.05, 0);
    g.add(tag);

    // hole cards (table only)
    let hole = null;
    if (withCards && cards && cards.length >= 2) {
      hole = makeHoleCards(cards[0], cards[1]);
      hole.position.set(0, 2.28, 0);
      g.add(hole);
    }

    // scale to feel human
    g.scale.setScalar(HUMAN_SCALE);

    g.userData = {
      pelvis,
      head,
      face,
      armL, armR,
      elbowL, elbowR,
      hipL, hipR,
      kneeL, kneeR,
      tag,
      hole,
      role: "lobby", // or "table"
      sit01: 0,
      gazeTag: false
    };
    return g;
  }

  function setSitPose(av, sit01) {
    const u = av.userData;
    const t = clamp(sit01, 0, 1);
    u.sit01 = t;

    // hips/knees bend
    const hipBend  = lerp(0.0, -0.70, t);
    const kneeBend = lerp(0.0,  1.35, t);

    u.hipL.rotation.x = hipBend;
    u.hipR.rotation.x = hipBend;
    u.kneeL.rotation.x = kneeBend;
    u.kneeR.rotation.x = kneeBend;

    // arms settle forward a bit when seated
    u.armL.rotation.x = lerp(-0.20, -0.55, t);
    u.armR.rotation.x = lerp(-0.20, -0.55, t);

    // elbows slightly bent always
    u.elbowL.rotation.x = lerp(0.25, 0.55, t);
    u.elbowR.rotation.x = lerp(0.25, 0.55, t);
  }

  // ---- avoidance / separation ----
  function avoidPoint(pos, p, radius, strength = 1.0) {
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.0001) return;
    if (d < radius) {
      const push = (radius - d) * 1.15 * strength;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    }
  }

  function separateBots(bots, minDist = 0.62) {
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const a = bots[i].position;
        const b = bots[j].position;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.0001 && d < minDist) {
          const push = (minDist - d) * 0.50;
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          b.x -= (dx / d) * push;
          b.z -= (dz / d) * push;
        }
      }
    }
  }

  function clampToLobby(pos) {
    if (typeof getLobbyZone !== "function") return;
    const z = getLobbyZone();
    if (!z || !z.min || !z.max) return;
    pos.x = clamp(pos.x, z.min.x + 0.4, z.max.x - 0.4);
    pos.z = clamp(pos.z, z.min.z + 0.4, z.max.z - 0.4);
  }

  // ---- build bots ----
  function addSeatedBot(seatIndex, name, chips, gender, deck) {
    const seat = seats[seatIndex];
    if (!seat) return null;

    const anchor = seat.anchor || null;
    const anchorPos = anchor ? worldPosOf(anchor) : (seat.position ? seat.position.clone() : null);
    if (!anchorPos) return null;

    const c1 = deck.pop();
    const c2 = deck.pop();
    const cards = [c1, c2].filter(Boolean);

    const bot = makeHumanoid({
      gender,
      name,
      chips,
      withCards: true,
      cards,
      suitColor: gender === "f" ? 0x1a2230 : 0x111a24,
      skinColor: gender === "f" ? 0xe0c2b2 : 0xd2b48c
    });
    bot.userData.role = "table";

    // Put pelvis base onto seat surface:
    // bot.position.y so that pelvis world y becomes seat surface y.
    bot.position.copy(anchorPos);

    // IMPORTANT: because we scaled the bot, pelvis base is scaled too.
    // effective pelvis base in world = PELVIS_BASE_Y * HUMAN_SCALE
    const pelvisWorld = PELVIS_BASE_Y * HUMAN_SCALE;
    bot.position.y -= pelvisWorld;

    // Face table center reliably (ignore possibly-bad seat.yaw)
    const yaw = yawToward(anchorPos, tableFocus);
    bot.rotation.y = yaw;

    // Sit pose
    setSitPose(bot, 1);

    // lift tiny so hips don’t clip chair (seat surface variances)
    bot.position.y += 0.01;

    root.add(bot);
    state.bots.push(bot);
    state.seated.push(bot);
    return bot;
  }

  function addWalker(i, gender) {
    const bot = makeHumanoid({
      gender,
      name: (gender === "f" ? "GUEST" : "LOBBY"),
      chips: 0,
      withCards: false,
      suitColor: 0x1a1f2a,
      skinColor: gender === "f" ? 0xe0c2b2 : 0xd2b48c
    });
    bot.userData.role = "lobby";
    setSitPose(bot, 0);

    // start around lobby/table outskirts
    const startR = railRadius + randRange(1.2, 4.2);
    const ang = randRange(0, Math.PI * 2);
    bot.position.set(
      tableFocus.x + Math.cos(ang) * startR,
      0,
      tableFocus.z + Math.sin(ang) * startR
    );

    clampToLobby(bot.position);

    const w = {
      bot,
      target: bot.position.clone(),
      speed: randRange(0.55, 0.95),
      phase: randRange(0, 10),
      pauseT: randRange(0, 1.2),
      interest: "wander",
      lookAtTableT: 0
    };

    pickNewTarget(w);

    root.add(bot);
    state.walkers.push(w);
    state.bots.push(bot);
    return w;
  }

  function pickNewTarget(w) {
    // distribute targets so they don’t herd:
    // 70%: ring around table (spectator)
    // 30%: roam lobby bounds (if defined)
    const ring = (rand01() < 0.70);

    if (ring) {
      const r = railRadius + randRange(0.9, 3.6);
      const a = randRange(0, Math.PI * 2);
      w.target.set(
        tableFocus.x + Math.cos(a) * r,
        0,
        tableFocus.z + Math.sin(a) * r
      );
    } else if (typeof getLobbyZone === "function") {
      const z = getLobbyZone();
      if (z?.min && z?.max) {
        w.target.set(
          randRange(z.min.x + 0.8, z.max.x - 0.8),
          0,
          randRange(z.min.z + 0.8, z.max.z - 0.8)
        );
      } else {
        w.target.set(
          tableFocus.x + randRange(-10, 10),
          0,
          tableFocus.z + randRange(-8, 8)
        );
      }
    } else {
      w.target.set(
        tableFocus.x + randRange(-10, 10),
        0,
        tableFocus.z + randRange(-8, 8)
      );
    }

    clampToLobby(w.target);

    // decide if this leg is an “observe” pause
    w.pauseT = randRange(0.2, 1.4);
    w.lookAtTableT = rand01() < 0.35 ? randRange(0.8, 2.2) : 0;
  }

  // ---- gaze tag logic for lobby ----
  function updateLobbyTagVisibility(bot) {
    const u = bot.userData;
    if (!u || u.role !== "lobby") return;

    if (!cameraRef) { u.tag.visible = true; return; }

    const camPos = new THREE.Vector3();
    cameraRef.getWorldPosition(camPos);

    const bPos = bot.position.clone();
    // approximate head height
    bPos.y += 1.65;

    const to = bPos.sub(camPos);
    const dist = to.length();
    if (dist < 0.0001) { u.tag.visible = true; return; }
    to.normalize();

    const fwd = cameraForward();
    if (!fwd) { u.tag.visible = true; return; }

    // Only show tag if looking at them and within range
    const dot = fwd.dot(to);
    const looking = dot > 0.965; // tight cone
    const closeEnough = dist < 7.5;

    u.tag.visible = looking && closeEnough;
  }

  // ---- temp objects ----
  const _tmpQ = new THREE.Quaternion();
  const _tmpV = new THREE.Vector3();

  // ---- public API ----
  return {
    init({ THREE: _THREE, scene, getSeats, tableFocus: _tf, getLobbyZone: _glz, railRadius: _rr } = {}) {
      THREE = _THREE;
      sceneRef = scene;

      seats = (typeof getSeats === "function") ? (getSeats() || []) : (Array.isArray(getSeats) ? getSeats : []);
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      getLobbyZone = (typeof _glz === "function") ? _glz : null;
      if (typeof _rr === "number" && isFinite(_rr)) railRadius = _rr;

      // rebuild root
      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.t = 0;
      state.bots.length = 0;
      state.seated.length = 0;
      state.walkers.length = 0;

      // build deck for unique table hole cards
      const deck = makeDeck();

      // table bots (only if seats exist)
      if (Array.isArray(seats) && seats.length >= 2) {
        // pick indices 1..5 if available
        const indices = [1,2,3,4,5].filter(i => i < seats.length);
        const names = ["LUNA","JAX","NOVA","RAVEN","KAI"];
        const genders = ["f","m","f","m","m"];

        for (let k = 0; k < indices.length; k++) {
          addSeatedBot(indices[k], names[k] || ("BOT" + k), 10000, genders[k] || "m", deck);
        }
      }

      // walkers (more natural mix)
      const walkerCount = 12;
      for (let i = 0; i < walkerCount; i++) {
        addWalker(i, (i % 3 === 0) ? "f" : "m");
      }

      safeLog(`[Bots v3.0] init ✅ seated=${state.seated.length} walkers=${state.walkers.length}`);
    },

    setPlayerRig(rig, cam) {
      playerRig = rig || null;
      cameraRef = cam || null;
    },

    update(dt) {
      if (!root) return;
      state.t += dt;

      // WALKERS: wander + avoid rail/table + avoid player + separate
      for (const w of state.walkers) {
        const b = w.bot;
        const u = b.userData;
        const t = state.t + w.phase;

        // pause/observe occasionally
        if (w.pauseT > 0) {
          w.pauseT -= dt;
          // subtle idle
          u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.4) * 0.01;
          u.armL.rotation.z = 0.10 + Math.sin(t * 2.0) * 0.10;
          u.armR.rotation.z = -0.10 - Math.sin(t * 2.0) * 0.10;

          // face table if observing
          if (w.lookAtTableT > 0) {
            w.lookAtTableT -= dt;
            b.rotation.y = yawToward(b.position, tableFocus);
          }
        } else {
          // move toward target
          const dx = w.target.x - b.position.x;
          const dz = w.target.z - b.position.z;
          const d = Math.max(0.0001, Math.hypot(dx, dz));

          b.position.x += (dx / d) * w.speed * dt;
          b.position.z += (dz / d) * w.speed * dt;
          b.rotation.y = Math.atan2(dx, dz);

          // reached target
          if (d < 0.45) pickNewTarget(w);
        }

        // keep on floor
        b.position.y = 0;

        // avoid rail (keep them OUTSIDE railRadius)
        const rx = b.position.x - tableFocus.x;
        const rz = b.position.z - tableFocus.z;
        const rd = Math.hypot(rx, rz);
        if (rd < railRadius + 0.25) {
          const push = (railRadius + 0.25 - rd) * 1.25;
          b.position.x += (rx / Math.max(0.0001, rd)) * push;
          b.position.z += (rz / Math.max(0.0001, rd)) * push;
        }

        // avoid player ring
        if (playerRig) avoidPoint(b.position, playerRig.position, 1.35, 1.0);

        // clamp to lobby zone if provided
        clampToLobby(b.position);

        // gait (elbows + knees)
        const gait = Math.sin(t * 6.2);
        const bend = Math.abs(gait) * 0.62;
        const swing = gait * 0.55;

        u.hipL.rotation.x = -0.12 - bend * 0.55;
        u.kneeL.rotation.x = 0.20 + bend * 1.05;
        u.hipR.rotation.x = -0.12 - (1 - bend) * 0.55;
        u.kneeR.rotation.x = 0.20 + (1 - bend) * 1.05;

        u.armL.rotation.x = -0.20 + swing;
        u.armR.rotation.x = -0.20 - swing;

        u.elbowL.rotation.x = 0.35 + Math.abs(swing) * 0.25;
        u.elbowR.rotation.x = 0.35 + Math.abs(swing) * 0.25;

        // tiny bob
        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 2.4) * 0.01;

        // tags: gaze-based
        updateLobbyTagVisibility(b);
        billboardToCamera(u.tag);
      }

      // separation so they don't overlap
      separateBots(state.walkers.map(w => w.bot), 0.70);

      // SEATED: sit idle + cards face camera + tag always
      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x * 0.5;

        // seated breathing
        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.5) * 0.008;

        // seated arms idle
        u.armL.rotation.z = 0.12 + Math.sin(t * 2.0) * 0.10;
        u.armR.rotation.z = -0.12 - Math.sin(t * 2.0) * 0.10;

        // keep tags visible, above head
        if (u.tag) {
          u.tag.visible = true;
          billboardToCamera(u.tag);
        }

        // hole cards hover and face player
        if (u.hole) {
          u.hole.position.y = 2.28 + Math.sin(t * 2.0) * 0.03;
          billboardToCamera(u.hole);
        }

        // head slightly looks toward player sometimes
        if (cameraRef) {
          const camPos = new THREE.Vector3();
          cameraRef.getWorldPosition(camPos);
          const headWorld = new THREE.Vector3();
          headWorld.copy(b.position); headWorld.y += 1.75;
          const yaw = yawToward(headWorld, camPos);
          // subtle: only rotate a bit toward player
          b.rotation.y = lerp(b.rotation.y, yawToward(b.position, tableFocus), 0.01);
          // (table facing stays dominant)
        }
      }
    }
  };
})();
