// /js/bots.js — Scarlett Bots v2.6 (SMOOTH SEEK + SLERP + GROUND FIX)
// Exports: Bots
// - Walkers: smooth target-seeking (slerp + translateZ), no "sliding"
// - Seated bots: placed on seat anchors if available
// - Avoids rail + avoids player + separation
// - Tags higher; hole cards higher than tags
// - Keeps walkers planted to floor (y=0)

export const Bots = (() => {
  let THREE = null;
  let root = null;

  let seats = [];
  let tableFocus = null;

  let playerRig = null;
  let cameraRef = null;

  const state = {
    t: 0,
    seated: [],
    walkers: [],
    bots: [],
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);

  // geometry anchor so feet land on Y=0 when bot.position.y = 0 - PELVIS_BASE_Y (for seated)
  const PELVIS_BASE_Y = 0.46;

  // Smooth bot settings (your requested logic, tuned)
  const botSettings = {
    walkSpeed: 1.15,       // m/s
    rotationSpeed: 4.0,    // higher = faster turning
    stopDistance: 0.55,
  };

  // ---- helper: canvas tag (name + chips) ----
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
    ctx.fillText(name, 256, 104);

    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 38px Arial";
    ctx.fillText("$" + Number(chips).toLocaleString(), 256, 162);

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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), mat);
    mesh.name = "NameTag";
    mesh.renderOrder = 50;
    return mesh;
  }

  // ---- cards above head (simple) ----
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

    // BIGGER corner ranks (your request)
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, 18, 10);
    ctx.font = "bold 68px Arial";
    ctx.fillText(suit, 18, 70);

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 64px Arial";
    ctx.fillText(rank, c.width - 18, c.height - 78);
    ctx.font = "bold 68px Arial";
    ctx.fillText(suit, c.width - 18, c.height - 12);

    // center suit
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 150px Arial";
    ctx.fillText(suit, c.width/2, c.height/2 + 10);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeHoleCards() {
    const g = new THREE.Group();
    g.name = "HoleCards";

    const geo = new THREE.PlaneGeometry(0.20, 0.28);

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

      // reduce z-flicker
      face.polygonOffset = true; face.polygonOffsetFactor = -2; face.polygonOffsetUnits = -2;
      back.polygonOffset = true; back.polygonOffsetFactor = -2; back.polygonOffsetUnits = -2;

      const card = new THREE.Group();
      const faceM = new THREE.Mesh(geo, face);
      const backM = new THREE.Mesh(geo, back);

      faceM.position.z = 0.002;
      backM.position.z = -0.002;
      backM.rotation.y = Math.PI;

      card.add(faceM, backM);
      card.position.x = i * 0.24;
      card.renderOrder = 10;
      g.add(card);
    });

    return g;
  }

  // ---- avatar ----
  function makeAvatar({ suitColor=0x111318, skinColor=0xd2b48c, name="BOT", chips=10000, withCards=false, showTagAlways=true } = {}) {
    const g = new THREE.Group();
    g.name = "BotAvatar";

    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });

    // pelvis (rig root)
    const pelvis = new THREE.Group();
    pelvis.name = "pelvis";
    pelvis.position.y = PELVIS_BASE_Y;
    g.add(pelvis);

    // torso (slightly nicer than pill)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.50, 8, 16), suit);
    torso.position.y = 0.58;
    pelvis.add(torso);

    // chest/shoulder block
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.20), suit);
    chest.position.set(0, 0.72, 0.02);
    pelvis.add(chest);

    // head higher
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
    head.position.y = 0.92;
    pelvis.add(head);

    // arms + hands
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.28, 8, 12);
    const handGeo = new THREE.SphereGeometry(0.05, 14, 12);

    const armL = new THREE.Group(); armL.name = "armL";
    const armR = new THREE.Group(); armR.name = "armR";
    armL.position.set(-0.24, 0.74, 0.03);
    armR.position.set( 0.24, 0.74, 0.03);
    pelvis.add(armL, armR);

    const upperL = new THREE.Mesh(armGeo, suit); upperL.position.y = -0.14; armL.add(upperL);
    const upperR = new THREE.Mesh(armGeo, suit); upperR.position.y = -0.14; armR.add(upperR);

    const handL = new THREE.Mesh(handGeo, suit); handL.position.set(0, -0.34, 0.02); armL.add(handL);
    const handR = new THREE.Mesh(handGeo, suit); handR.position.set(0, -0.34, 0.02); armR.add(handR);

    // legs
    const thighGeo = new THREE.CapsuleGeometry(0.06, 0.28, 8, 14);
    const shinGeo  = new THREE.CapsuleGeometry(0.055, 0.26, 8, 14);
    const footGeo  = new THREE.BoxGeometry(0.12, 0.055, 0.23);

    const hipL = new THREE.Group(); hipL.name = "hipL";
    const hipR = new THREE.Group(); hipR.name = "hipR";
    hipL.position.set(-0.10, 0.24, 0);
    hipR.position.set( 0.10, 0.24, 0);
    pelvis.add(hipL, hipR);

    const thighL = new THREE.Mesh(thighGeo, suit); thighL.position.y = -0.16; hipL.add(thighL);
    const thighR = new THREE.Mesh(thighGeo, suit); thighR.position.y = -0.16; hipR.add(thighR);

    const kneeL = new THREE.Group(); kneeL.name = "kneeL"; kneeL.position.y = -0.32; hipL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.name = "kneeR"; kneeR.position.y = -0.32; hipR.add(kneeR);

    const shinL = new THREE.Mesh(shinGeo, suit); shinL.position.y = -0.15; kneeL.add(shinL);
    const shinR = new THREE.Mesh(shinGeo, suit); shinR.position.y = -0.15; kneeR.add(shinR);

    // shoes
    const footL = new THREE.Mesh(footGeo, new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.85 }));
    const footR = footL.clone();
    footL.position.set(0, -0.33, 0.09);
    footR.position.set(0, -0.33, 0.09);
    kneeL.add(footL);
    kneeR.add(footR);

    const tag = makeTag(name, chips);
    // higher tag (your request)
    tag.position.set(0, 1.92, 0);
    tag.visible = !!showTagAlways;
    g.add(tag);

    let cards = null;
    if (withCards) {
      cards = makeHoleCards();
      // cards higher than tag so they never overlap
      cards.position.set(-0.12, 2.18, 0);
      g.add(cards);
    }

    g.userData = {
      pelvis, head, armL, armR, hipL, hipR, kneeL, kneeR,
      tag, cards,
      showTagAlways
    };

    return g;
  }

  function billboardToPlayer(obj) {
    if (!obj) return;
    const ref = cameraRef || playerRig;
    if (!ref) return;
    const p = ref.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  // ---- placement ----
  function addSeatedBot(seatIndex, name, chips, flipYaw = false) {
    const seat = seats[seatIndex];
    if (!seat || !seat.anchor) return null;

    const bot = makeAvatar({ name, chips, suitColor: 0x121826, withCards: true, showTagAlways: true });
    bot.name = `SeatedBot_${seatIndex}`;

    const wp = new THREE.Vector3();
    seat.anchor.getWorldPosition(wp);

    bot.position.copy(wp);
    // pelvis base sits at anchor height
    bot.position.y -= PELVIS_BASE_Y;

    const yaw = seat.yaw || 0;
    bot.rotation.y = flipYaw ? (yaw + Math.PI) : yaw;

    root.add(bot);
    state.bots.push(bot);
    state.seated.push(bot);
    return bot;
  }

  function addWalker(i) {
    const bot = makeAvatar({
      name: "LOBBY",
      chips: 0,
      suitColor: (i % 2 === 0) ? 0x1a1f2a : 0x121826,
      withCards: false,
      showTagAlways: false // lobby tags only when looked at (we’ll still billboard)
    });

    bot.name = `Walker_${i}`;

    // spawn near table but outside rail radius
    const baseX = (tableFocus?.x || 0) + (Math.random() - 0.5) * 12;
    const baseZ = (tableFocus?.z || -6.5) + (Math.random() - 0.5) * 10;

    bot.position.set(baseX, 0, baseZ);

    const w = {
      bot,
      target: new THREE.Vector3(baseX, 0, baseZ),
      speed: 0.95 + Math.random() * 0.35,
      phase: Math.random() * 10,
      // keep outside rail
      railR: 3.85,
      // small random repath timer
      repathT: 0.5 + Math.random() * 1.8,
    };

    pickNewTarget(w, true);

    root.add(bot);
    state.walkers.push(w);
    state.bots.push(bot);
    return w;
  }

  function pickNewTarget(w, force = false) {
    // pick a random point around the table but OUTSIDE rail radius
    const cx = tableFocus?.x || 0;
    const cz = tableFocus?.z || -6.5;

    // random ring outside rail: 4.2 .. 7.5
    const r = 4.2 + Math.random() * 3.3;
    const a = Math.random() * Math.PI * 2;

    w.target.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);

    if (force) w.repathT = 0.5 + Math.random() * 1.8;
  }

  // --- bot movement: your smooth logic (slerp + translateZ) ---
  const _dir = { v: null };
  const _lookMat = { m: null };
  const _tQuat = { q: null };

  function updateBotMovement(botModel, targetPosition, deltaTime) {
    if (!botModel || !targetPosition) return;

    const direction = _dir.v;
    direction.subVectors(targetPosition, botModel.position);
    direction.y = 0;

    const distance = direction.length();

    if (distance > botSettings.stopDistance) {
      // Smooth rotation
      const lookMatrix = _lookMat.m;
      lookMatrix.lookAt(targetPosition, botModel.position, botModel.up);

      const targetQuaternion = _tQuat.q;
      targetQuaternion.setFromRotationMatrix(lookMatrix);

      botModel.quaternion.slerp(targetQuaternion, botSettings.rotationSpeed * deltaTime);

      // Walk forward in local space (no sideways slide)
      const step = botSettings.walkSpeed * deltaTime;
      botModel.translateZ(step);

      // keep planted
      botModel.position.y = 0;
    } else {
      // arrived: stop + repath handled elsewhere
      botModel.position.y = 0;
    }
  }

  // avoid point (player)
  function avoidPoint(pos, p, radius) {
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.0001) return;
    if (d < radius) {
      const push = (radius - d) * 1.2;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    }
  }

  // separate walkers so they don't overlap
  function separateBots(bots, minDist = 0.62) {
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
    init({ THREE: _THREE, scene, getSeats, tableFocus: _tf } = {}) {
      THREE = _THREE;
      seats = (typeof getSeats === "function") ? (getSeats() || []) : [];
      tableFocus = _tf || new THREE.Vector3(0, 0, -6.5);

      // preallocate vectors for movement to avoid GC
      _dir.v = new THREE.Vector3();
      _lookMat.m = new THREE.Matrix4();
      _tQuat.q = new THREE.Quaternion();

      if (root) { try { scene.remove(root); } catch {} }
      root = new THREE.Group();
      root.name = "BotsRoot";
      scene.add(root);

      state.t = 0;
      state.bots.length = 0;
      state.seated.length = 0;
      state.walkers.length = 0;

      // seated bots (try both yaw orientations if chairs are reversed in your current world)
      if (seats.length) {
        // If your chairs are facing wrong, flipYaw=true fixes without touching world
        const flipYaw = true;

        addSeatedBot(1, "LUNA", 10000, flipYaw);
        addSeatedBot(2, "JAX", 10000, flipYaw);
        addSeatedBot(3, "NOVA", 10000, flipYaw);
        addSeatedBot(4, "RAVEN", 10000, flipYaw);
        addSeatedBot(5, "KAI", 10000, flipYaw);
      }

      // walkers
      for (let i = 0; i < 10; i++) addWalker(i);

      console.log("[Bots] init ✅ seated=" + state.seated.length + " walkers=" + state.walkers.length);
    },

    setPlayerRig(rig, cam) { playerRig = rig || null; cameraRef = cam || null; },

    // Optional: world can call this when player looks at NPC
    // Example later: Bots.setLobbyTagVisible(bot, true/false)
    setLobbyTagVisible(bot, visible) {
      try {
        if (!bot?.userData?.tag) return;
        if (bot.userData.showTagAlways) return;
        bot.userData.tag.visible = !!visible;
      } catch {}
    },

    update(dt) {
      if (!root) return;
      state.t += dt;

      // Walkers: smooth seek + avoid + repath
      for (const w of state.walkers) {
        const b = w.bot;
        const u = b.userData;

        // repath timer
        w.repathT -= dt;
        if (w.repathT <= 0) {
          pickNewTarget(w, true);
        }

        // Avoid player circle
        if (playerRig) avoidPoint(b.position, playerRig.position, 1.25);

        // Keep outside rail radius
        const cx = tableFocus?.x || 0;
        const cz = tableFocus?.z || -6.5;

        const rx = b.position.x - cx;
        const rz = b.position.z - cz;
        const rd = Math.hypot(rx, rz);
        if (rd < w.railR) {
          // push outward and repath
          const push = (w.railR - rd) * 1.6;
          b.position.x += (rx / Math.max(0.0001, rd)) * push;
          b.position.z += (rz / Math.max(0.0001, rd)) * push;
          pickNewTarget(w, true);
        }

        // Smooth movement toward target (your logic)
        updateBotMovement(b, w.target, dt);

        // Lobby tags: default hidden until looked at; still billboard if visible
        billboardToPlayer(u.tag);
      }

      // No overlapping
      separateBots(state.walkers.map(w => w.bot), 0.65);

      // Seated bots: idle + cards face player
      for (const b of state.seated) {
        const u = b.userData;
        const t = state.t + b.position.x;

        // seated micro-breath (does not affect feet because seated)
        u.pelvis.position.y = PELVIS_BASE_Y + Math.sin(t * 1.6) * 0.01;

        // idle arm motion
        u.armL.rotation.z = 0.12 + Math.sin(t * 2.2) * 0.10;
        u.armR.rotation.z = -0.12 - Math.sin(t * 2.2) * 0.10;

        // keep tags and cards readable
        if (u.cards) {
          u.cards.position.y = 2.18 + Math.sin(t * 2.0) * 0.02;
          billboardToPlayer(u.cards);
        }
        billboardToPlayer(u.tag);
      }
    }
  };
})();
