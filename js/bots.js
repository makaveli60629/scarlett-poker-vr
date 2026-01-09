// /js/bots.js — Scarlett Bots v2.6 (GROUND PLANT + HIGHER TAGS + HIGHER CARDS)
// Exports: Bots
// ✅ Bot model auto-calibrates to floor (no floating walkers)
// ✅ Tags higher over heads (no face overlap)
// ✅ Cards higher than tags (no overlap)
// ✅ Lobby tags only appear when looked at
// ✅ Seated bots face table regardless of chair yaw

export const Bots = (() => {
  let THREE = null;
  let sceneRef = null;
  let root = null;

  let seats = [];
  let tableFocus = null;
  let metrics = { tableY: 0.92, seatY: 0.52 };

  let playerRig = null;
  let cameraRef = null;

  const state = { t: 0, bots: [], seated: [], walkers: [] };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function safeGetWorldPos(obj, out) {
    try { obj.getWorldPosition(out); return true; } catch { return false; }
  }

  function yawToFace(fromPos, toPos) {
    const dx = (toPos.x - fromPos.x);
    const dz = (toPos.z - fromPos.z);
    return Math.atan2(dx, dz);
  }

  function billboardToCamera(obj, lockY = true) {
    if (!obj || !cameraRef) return;
    const p = new THREE.Vector3();
    cameraRef.getWorldPosition(p);
    if (lockY) obj.lookAt(p.x, obj.position.y, p.z);
    else obj.lookAt(p);
  }

  // ---------- tag ----------
  function makeCanvasTag(name, chips) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);

    ctx.fillStyle = "rgba(0,0,0,0.62)";
    rr(26, 54, 460, 148, 26, true);

    ctx.fillStyle = "rgba(127,231,255,0.18)";
    rr(36, 64, 440, 40, 18, true);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 112);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "900 38px Arial";
    ctx.fillText("$" + Number(chips||0).toLocaleString(), 256, 168);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;

    function rr(x, y, w, h, r, fill) {
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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.34), mat);
    mesh.name = "NameTag";
    mesh.renderOrder = 999;
    mesh.visible = true;
    return mesh;
  }

  // ---------- optional simple cards ----------
  function cardTexture(rank, suit) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 356;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#f7f7f8";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 6;
    ctx.strokeRect(6,6,c.width-12,c.height-12);

    const isRed = (suit === "♥" || suit === "♦");
    ctx.fillStyle = isRed ? "#b6001b" : "#121214";

    // bigger corners
    ctx.font = "900 72px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, 18, 10);
    ctx.font = "900 74px Arial";
    ctx.fillText(suit, 18, 86);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "900 72px Arial";
    ctx.fillText(rank, c.width - 18, c.height - 92);
    ctx.font = "900 74px Arial";
    ctx.fillText(suit, c.width - 18, c.height - 14);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 150px Arial";
    ctx.fillText(suit, c.width/2, c.height/2 + 8);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeHoleCards() {
    const g = new THREE.Group();
    g.name = "HoleCards";
    const geo = new THREE.PlaneGeometry(0.24, 0.34);
    const defs = [{ r:"A", s:"♦" }, { r:"K", s:"♠" }];

    defs.forEach((cs, i) => {
      const face = new THREE.MeshStandardMaterial({
        map: cardTexture(cs.r, cs.s),
        roughness: 0.55,
        metalness: 0.05,
        emissive: 0x111111,
        emissiveIntensity: 0.20,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });

      const back = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.6,
        emissive: 0x220010,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });

      const card = new THREE.Group();
      const faceM = new THREE.Mesh(geo, face);
      const backM = new THREE.Mesh(geo, back);
      faceM.position.z = 0.002;
      backM.position.z = -0.002;
      backM.rotation.y = Math.PI;

      card.add(faceM, backM);
      card.position.x = i * 0.28;
      card.renderOrder = 50;
      g.add(card);
    });

    return g;
  }

  // ---------- HUMANOID LOW-POLY ----------
  // Key fix: internal model is shifted so its lowest point touches y=0.
  function makeHumanoid({
    name="BOT", chips=10000,
    suitColor=0x151a22,
    accent=0x7fe7ff,
    skinColor=0xd2b48c,
    female=false,
    withCards=false,
  } = {}) {
    const g = new THREE.Group();
    g.name = "BotHumanoid";

    // INTERNAL model container (we will shift THIS to plant feet)
    const model = new THREE.Group();
    model.name = "BotModel";
    g.add(model);

    const suit  = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.78, metalness: 0.06 });
    const suit2 = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55, metalness: 0.10, emissive: accent, emissiveIntensity: 0.08 });
    const skin  = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65, metalness: 0.02 });

    const rig = {
      model,
      pelvis: new THREE.Group(),
      spine: new THREE.Group(),
      neck: new THREE.Group(),
      head: null,
      shoulderL: new THREE.Group(),
      shoulderR: new THREE.Group(),
      elbowL: new THREE.Group(),
      elbowR: new THREE.Group(),
      hipL: new THREE.Group(),
      hipR: new THREE.Group(),
      kneeL: new THREE.Group(),
      kneeR: new THREE.Group(),
      tag: null,
      cards: null,
      groundShift: 0,
    };

    rig.pelvis.name = "pelvis";
    model.add(rig.pelvis);

    const torsoW = female ? 0.30 : 0.32;
    const torsoH = female ? 0.42 : 0.46;

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.18), suit);
    hips.position.set(0, 0.92, 0);
    rig.pelvis.add(hips);

    rig.spine.position.set(0, 0.96, 0);
    rig.pelvis.add(rig.spine);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, 0.20), suit);
    chest.position.set(0, 0.26, 0.02);
    rig.spine.add(chest);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(torsoW*0.85, 0.05, 0.22), suit2);
    collar.position.set(0, 0.48, 0.03);
    rig.spine.add(collar);

    rig.neck.position.set(0, 0.52, 0.04);
    rig.spine.add(rig.neck);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 10), skin);
    neck.position.set(0, 0.05, 0);
    rig.neck.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), skin);
    head.position.set(0, 0.22, 0);
    rig.neck.add(head);
    rig.head = head;

    rig.shoulderL.position.set(-(torsoW*0.56), 0.44, 0.02);
    rig.shoulderR.position.set( (torsoW*0.56), 0.44, 0.02);
    rig.spine.add(rig.shoulderL, rig.shoulderR);

    const upperArmGeo = new THREE.CapsuleGeometry(0.045, 0.22, 6, 10);
    const foreArmGeo  = new THREE.CapsuleGeometry(0.042, 0.20, 6, 10);
    const handGeo     = new THREE.BoxGeometry(0.08, 0.05, 0.10);

    const upperL = new THREE.Mesh(upperArmGeo, suit);
    const upperR = new THREE.Mesh(upperArmGeo, suit);
    upperL.rotation.z = 0.18;
    upperR.rotation.z = -0.18;
    upperL.position.set(-0.02, -0.12, 0.02);
    upperR.position.set( 0.02, -0.12, 0.02);
    rig.shoulderL.add(upperL);
    rig.shoulderR.add(upperR);

    rig.elbowL.position.set(-0.06, -0.28, 0.02);
    rig.elbowR.position.set( 0.06, -0.28, 0.02);
    rig.shoulderL.add(rig.elbowL);
    rig.shoulderR.add(rig.elbowR);

    const foreL = new THREE.Mesh(foreArmGeo, suit);
    const foreR = new THREE.Mesh(foreArmGeo, suit);
    foreL.rotation.z = 0.18;
    foreR.rotation.z = -0.18;
    foreL.position.set(0.00, -0.10, 0.02);
    foreR.position.set(0.00, -0.10, 0.02);
    rig.elbowL.add(foreL);
    rig.elbowR.add(foreR);

    const handL = new THREE.Mesh(handGeo, suit2);
    const handR = new THREE.Mesh(handGeo, suit2);
    handL.position.set(0, -0.24, 0.05);
    handR.position.set(0, -0.24, 0.05);
    rig.elbowL.add(handL);
    rig.elbowR.add(handR);

    // legs
    rig.hipL.position.set(-0.10, 0.88, 0);
    rig.hipR.position.set( 0.10, 0.88, 0);
    rig.pelvis.add(rig.hipL, rig.hipR);

    const thighGeo = new THREE.CapsuleGeometry(0.06, 0.28, 6, 12);
    const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.26, 6, 12);
    const shoeGeo  = new THREE.BoxGeometry(0.12, 0.06, 0.24);

    const thighL = new THREE.Mesh(thighGeo, suit);
    const thighR = new THREE.Mesh(thighGeo, suit);
    thighL.position.set(0, -0.16, 0);
    thighR.position.set(0, -0.16, 0);
    rig.hipL.add(thighL);
    rig.hipR.add(thighR);

    rig.kneeL.position.set(0, -0.34, 0);
    rig.kneeR.position.set(0, -0.34, 0);
    rig.hipL.add(rig.kneeL);
    rig.hipR.add(rig.kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit);
    const shinR = new THREE.Mesh(shinGeo, suit);
    shinL.position.set(0, -0.14, 0);
    shinR.position.set(0, -0.14, 0);
    rig.kneeL.add(shinL);
    rig.kneeR.add(shinR);

    const shoeL = new THREE.Mesh(shoeGeo, suit2);
    const shoeR = new THREE.Mesh(shoeGeo, suit2);
    shoeL.position.set(0, -0.30, 0.09);
    shoeR.position.set(0, -0.30, 0.09);
    rig.kneeL.add(shoeL);
    rig.kneeR.add(shoeR);

    // ---- AUTO FLOOR PLANT (fix floating walkers) ----
    // compute lowest y of internal model, shift it down so minY becomes 0
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const shift = -box.min.y;
    model.position.y += shift;
    rig.groundShift = shift;

    // Tag + Cards (higher)
    rig.tag = makeTag(name, chips);
    rig.tag.position.set(0, 2.05, 0); // ✅ higher than head
    g.add(rig.tag);

    if (withCards) {
      rig.cards = makeHoleCards();
      rig.cards.position.set(-0.14, 2.32, 0); // ✅ higher than tag
      g.add(rig.cards);
    }

    g.userData = rig;
    return g;
  }

  // ---------- avoidance / spacing ----------
  function avoidPoint(pos, p, radius) {
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.0001) return;
    if (d < radius) {
      const push = (radius - d) * 0.85;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    }
  }

  function separate(bots, minDist=0.70) {
    for (let i=0;i<bots.length;i++){
      for (let j=i+1;j<bots.length;j++){
        const a = bots[i].position, b = bots[j].position;
        const dx = a.x - b.x, dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.0001 && d < minDist) {
          const push = (minDist - d) * 0.52;
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          b.x -= (dx / d) * push;
          b.z -= (dz / d) * push;
        }
      }
    }
  }

  // ---------- gaze tags ----------
  function isLookedAt(bot, maxDist=7.5, cone=0.92) {
    if (!cameraRef) return false;
    const camPos = new THREE.Vector3();
    cameraRef.getWorldPosition(camPos);

    const botPos = new THREE.Vector3();
    bot.getWorldPosition(botPos);

    const toBot = botPos.sub(camPos);
    const dist = toBot.length();
    if (dist > maxDist) return false;

    toBot.normalize();

    const camFwd = new THREE.Vector3(0,0,-1)
      .applyQuaternion(cameraRef.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    return camFwd.dot(toBot) > cone;
  }

  // ---------- spawners ----------
  function addSeatedBot(seatIndex, name, chips, female=false) {
    const seat = seats[seatIndex];
    if (!seat || !seat.anchor) return null;

    const bot = makeHumanoid({
      name, chips, female,
      suitColor: 0x121826,
      accent: female ? 0xff2d7a : 0x7fe7ff,
      withCards: true,
    });

    const wp = new THREE.Vector3();
    if (!safeGetWorldPos(seat.anchor, wp)) return null;

    bot.position.copy(wp);

    // keep seated stable: use anchor y directly (model is floor-planted internally now)
    bot.position.y = wp.y;

    // always face table (fix “chair reversed” symptom visually)
    bot.rotation.y = yawToFace(wp, tableFocus || new THREE.Vector3(0,0,-6.5));

    // seated pose
    bot.userData.hipL.rotation.x = -0.65;
    bot.userData.hipR.rotation.x = -0.65;
    bot.userData.kneeL.rotation.x = 1.05;
    bot.userData.kneeR.rotation.x = 1.05;
    bot.userData.shoulderL.rotation.x = -0.35;
    bot.userData.shoulderR.rotation.x = -0.35;
    bot.userData.elbowL.rotation.x = -0.55;
    bot.userData.elbowR.rotation.x = -0.55;

    root.add(bot);
    state.bots.push(bot);
    state.seated.push(bot);
    return bot;
  }

  function addWalker(i, female=false) {
    const bot = makeHumanoid({
      name: female ? "MAYA" : "NOAH",
      chips: 0,
      female,
      suitColor: 0x1a1f2a,
      accent: female ? 0xff2d7a : 0x7fe7ff,
      withCards: false,
    });

    bot.name = `Walker_${i}`;

    bot.position.set(
      (tableFocus?.x || 0) + (Math.random()-0.5)*14,
      0, // ✅ now truly planted
      (tableFocus?.z || -6.5) + (Math.random()-0.5)*12
    );

    if (bot.userData?.tag) bot.userData.tag.visible = false;

    const w = {
      bot,
      target: new THREE.Vector3(
        (tableFocus?.x || 0) + (Math.random()-0.5)*14,
        0,
        (tableFocus?.z || -6.5) + (Math.random()-0.5)*12
      ),
      speed: 0.55 + Math.random()*0.35,
      phase: Math.random()*10,
    };

    root.add(bot);
    state.walkers.push(w);
    state.bots.push(bot);
    return w;
  }

  function pickTarget(w) {
    w.target.set(
      (tableFocus?.x || 0) + (Math.random()-0.5)*14,
      0,
      (tableFocus?.z || -6.5) + (Math.random()-0.5)*12
    );
  }

  // ---------- API ----------
  return {
    init({ THREE: _THREE, scene, getSeats, tableFocus: _tf, metrics: _m } = {}) {
      THREE = _THREE;
      sceneRef = scene;

      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);
      if (_m) metrics = _m;

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.t = 0;
      state.bots.length = 0;
      state.seated.length = 0;
      state.walkers.length = 0;

      if (seats.length) {
        addSeatedBot(1, "LUNA", 10000, true);
        addSeatedBot(2, "JAX", 10000, false);
        addSeatedBot(3, "NOVA", 10000, true);
        addSeatedBot(4, "RAVEN", 10000, false);
        addSeatedBot(5, "KAI", 10000, false);
      }

      // 1 male + 1 female lobby walker
      addWalker(0, false);
      addWalker(1, true);

      console.log("[Bots] init ✅ seated=" + state.seated.length + " walkers=" + state.walkers.length);
    },

    setPlayerRig(rig, cam) { playerRig = rig || null; cameraRef = cam || null; },

    update(dt) {
      if (!root || !THREE) return;
      state.t += dt;

      // walkers
      for (const w of state.walkers) {
        const b = w.bot;
        const u = b.userData;
        const t = state.t + w.phase;

        const dxT = w.target.x - b.position.x;
        const dzT = w.target.z - b.position.z;
        if (Math.hypot(dxT, dzT) < 0.45) pickTarget(w);
        if (Math.random() < 0.002) pickTarget(w);

        const dx = w.target.x - b.position.x;
        const dz = w.target.z - b.position.z;
        const d = Math.max(0.0001, Math.hypot(dx, dz));

        b.position.x += (dx / d) * w.speed * dt;
        b.position.z += (dz / d) * w.speed * dt;
        b.rotation.y = Math.atan2(dx, dz);

        // keep outside rail
        const rx = b.position.x - tableFocus.x;
        const rz = b.position.z - tableFocus.z;
        const rd = Math.hypot(rx, rz);
        const railR = 3.85;
        if (rd < railR) {
          const push = (railR - rd) * 1.25;
          b.position.x += (rx / Math.max(0.0001, rd)) * push;
          b.position.z += (rz / Math.max(0.0001, rd)) * push;
        }

        if (playerRig) avoidPoint(b.position, playerRig.position, 1.35);

        // ✅ planted (model calibrated)
        b.position.y = 0;

        // walk animation
        const gait = Math.sin(t * 6.2);
        const bend = Math.abs(gait);
        const swing = gait;

        u.hipL.rotation.x = -0.25 - bend * 0.55;
        u.kneeL.rotation.x = 0.35 + bend * 0.95;
        u.hipR.rotation.x = -0.25 - (1 - bend) * 0.55;
        u.kneeR.rotation.x = 0.35 + (1 - bend) * 0.95;

        u.shoulderL.rotation.x = -0.10 + swing * 0.35;
        u.shoulderR.rotation.x = -0.10 - swing * 0.35;
        u.elbowL.rotation.x = -0.25 - swing * 0.20;
        u.elbowR.rotation.x = -0.25 + swing * 0.20;

        // gaze tags for lobby
        if (u.tag) {
          const looked = isLookedAt(b, 7.5, 0.92);
          u.tag.visible = looked;
          if (looked) billboardToCamera(u.tag, true);
        }
      }

      separate(state.walkers.map(w => w.bot), 0.75);

      // seated idle + always-visible tags + cards face camera
      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x * 0.5;

        if (u.tag) {
          u.tag.visible = true;
          billboardToCamera(u.tag, true);
        }
        if (u.cards) {
          u.cards.position.y = 2.32 + Math.sin(t * 1.9) * 0.03;
          billboardToCamera(u.cards, true);
        }
      }
    }
  };
})();
