// /js/poker_demo.js — Poker Session 3.0 (streets + betting beats + table HUD + readable ranks/suits + billboard)
// ✅ flop(3) -> turn -> river
// ✅ community bigger+higher than player cards
// ✅ community + hole cards billboard to viewer so you can read them
// ✅ table HUD (street/turn/pot)
// ✅ dealer button + pot marker
// ✅ audio triggers if Sound present

export const PokerDemo = (() => {
  let THREE = null, world = null, scene = null, Sound = null;

  const state = {
    t: 0,
    street: "preflop", // preflop | flop | turn | river | showdown
    stepTimer: 0,
    actionIndex: 0,
    pot: 0,
    dealerIndex: 0,
    players: [],
    community: [],
    tableHUD: null,
    dealerBtn: null,
    potChip: null,
    lastHudText: ""
  };

  // Public helpers for tags
  function getStackFor(botName) {
    const p = state.players.find(x => x.bot?.name === botName);
    return p?.stack ?? 100000;
  }
  function getRankFor() { return "VIP"; }

  function init(ctx) {
    THREE = ctx.THREE;
    world = ctx.world;
    scene = ctx.scene;
    Sound = ctx.Sound || null;

    const demo = world.getDemo?.();
    if (!demo?.tableAnchor || !demo?.seatAnchors?.length) return;

    // create players + hole cards
    state.players = [];
    for (let i = 0; i < demo.seatAnchors.length; i++) {
      const seat = demo.seatAnchors[i];

      const bot = new THREE.Group();
      bot.name = `PlayerBot_${i + 1}`;
      bot.position.copy(seat.position);
      bot.quaternion.copy(seat.quaternion);
      demo.tableAnchor.add(bot);

      const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.10 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), botMat);
      body.position.set(0, 0.52, 0.08);
      bot.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), botMat);
      head.position.set(0, 1.00, 0.12);
      bot.add(head);

      const hole = makeHoleCards(i);
      hole.group.position.set(0, 2.20, 0.25);
      hole.group.scale.set(2.05, 2.05, 2.05);
      bot.add(hole.group);

      state.players.push({
        bot,
        stack: 100000,
        folded: false,
        hole
      });
    }

    // community cards (initially hidden)
    state.community = makeCommunityCards();
    state.community.group.position.set(0, 2.05, 0.10); // ✅ higher
    demo.tableAnchor.add(state.community.group);

    // dealer button
    state.dealerBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.06, 22),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, emissive: 0x111111, emissiveIntensity: 0.2 })
    );
    state.dealerBtn.position.set(1.25, 0.20, 1.10);
    demo.tableAnchor.add(state.dealerBtn);

    // pot marker
    state.potChip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.10, 20),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4, metalness: 0.05 })
    );
    state.potChip.position.set(0, 0.22, 0);
    demo.tableAnchor.add(state.potChip);

    // table HUD
    state.tableHUD = makeTableHUD();
    state.tableHUD.position.set(0, 2.85, -0.20);
    demo.tableAnchor.add(state.tableHUD);

    // start round
    startNewHand(demo.tableAnchor);
  }

  function update(dt) {
    state.t += dt;
    state.stepTimer += dt;

    // billboard hole cards + community toward viewer (camera quaternion)
    const q = getCameraQuat();
    if (q) {
      for (const p of state.players) p.hole.group.quaternion.copy(q);
      state.community.group.quaternion.copy(q);
      state.tableHUD.quaternion.copy(q);
    }

    // subtle float for readability
    for (let i = 0; i < state.players.length; i++) {
      state.players[i].hole.group.position.y = 2.20 + Math.sin(state.t * 1.1 + i) * 0.03;
    }
    state.community.group.position.y = 2.05 + Math.sin(state.t * 0.9) * 0.02;

    // step progression
    tickRound();

    // keep HUD updated
    updateHUD();
  }

  function tickRound() {
    // Timing beats: action rotates, then street advances.
    const actionBeat = 1.65;

    if (state.stepTimer < actionBeat) return;
    state.stepTimer = 0;

    // simulate one “player action”
    const p = state.players[state.actionIndex % state.players.length];
    if (p && !p.folded) {
      const bet = 200 + Math.floor(Math.random() * 800);
      p.stack = Math.max(0, p.stack - bet);
      state.pot += bet;

      // chip toss audio from player position
      if (Sound) {
        const wp = new THREE.Vector3();
        p.bot.getWorldPosition(wp);
        Sound.playAt("chipThrow", wp);
      }
      if (Sound) {
        const demo = world.getDemo?.();
        if (demo?.tableAnchor) {
          const end = new THREE.Vector3(0, demo.tableAnchor.position.y + 1.0, 0);
          Sound.playAt("chipStack", end);
        }
      }
    }

    state.actionIndex++;

    // After a full orbit of actions, advance street
    if (state.actionIndex % state.players.length === 0) {
      if (state.street === "preflop") {
        state.street = "flop";
        revealCommunity(3);
      } else if (state.street === "flop") {
        state.street = "turn";
        revealCommunity(4);
      } else if (state.street === "turn") {
        state.street = "river";
        revealCommunity(5);
      } else if (state.street === "river") {
        state.street = "showdown";
        // crown winner
        crownRandomWinner();
      } else if (state.street === "showdown") {
        startNewHand(world.getDemo?.().tableAnchor);
      }
    }
  }

  function startNewHand(tableAnchor) {
    state.street = "preflop";
    state.actionIndex = 0;
    state.pot = 0;

    // rotate dealer
    state.dealerIndex = (state.dealerIndex + 1) % state.players.length;

    // move dealer button near dealer seat
    const dealerBot = state.players[state.dealerIndex]?.bot;
    if (dealerBot && state.dealerBtn) {
      const wp = new THREE.Vector3();
      dealerBot.getWorldPosition(wp);
      // bring it to table space
      state.dealerBtn.position.set(
        clamp(wp.x * 0.22, -1.6, 1.6),
        0.20,
        clamp(wp.z * 0.22, -1.6, 1.6)
      );
    }

    // hide community, randomize faces
    state.community.setVisibleCount(0);

    // deal “new” hole cards
    for (let i = 0; i < state.players.length; i++) {
      state.players[i].folded = false;
      state.players[i].hole.setCards(randCard(), randCard());
    }

    // deal SFX from table
    if (Sound && tableAnchor) {
      const wp = new THREE.Vector3();
      tableAnchor.getWorldPosition(wp);
      Sound.playAt("cardDeal", wp);
    }
  }

  function revealCommunity(n) {
    state.community.setVisibleCount(n);

    // deal SFX from table
    if (Sound) {
      const demo = world.getDemo?.();
      if (demo?.tableAnchor) {
        const wp = new THREE.Vector3();
        demo.tableAnchor.getWorldPosition(wp);
        Sound.playAt("cardDeal", wp);
      }
    }
  }

  function crownRandomWinner() {
    const idx = Math.floor(Math.random() * state.players.length);
    const p = state.players[idx];
    if (!p) return;

    const crown = makeCrown();
    crown.position.set(0, 1.55, 0.0);
    p.bot.add(crown);

    // auto remove after a moment
    setTimeout(() => {
      if (crown.parent) crown.parent.remove(crown);
    }, 2200);
  }

  function updateHUD() {
    const turn = (state.actionIndex % state.players.length) + 1;
    const street = state.street.toUpperCase();
    const txt = `STREET: ${street}\nTURN: PLAYER ${turn}\nPOT: $${state.pot.toLocaleString()}`;

    if (txt === state.lastHudText) return;
    state.lastHudText = txt;

    drawHUD(state.tableHUD.material.map.image, txt);
    state.tableHUD.material.map.needsUpdate = true;
  }

  // ---------- card rendering ----------
  function makeCardTexture(card) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 356;
    const c = canvas.getContext("2d");
    drawCardFace(c, card);
    return canvas;
  }

  function drawCardFace(c, card) {
    const { r, s } = card;
    c.clearRect(0, 0, 256, 356);

    // card base
    c.fillStyle = "#f7f7fb";
    roundRect(c, 10, 10, 236, 336, 22); c.fill();

    c.strokeStyle = "rgba(20,24,42,0.35)";
    c.lineWidth = 6;
    roundRect(c, 10, 10, 236, 336, 22); c.stroke();

    const suitColor = (s === "♥" || s === "♦") ? "#ff2d7a" : "#111318";

    // corners (big)
    c.fillStyle = suitColor;
    c.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(r, 22, 78);
    c.font = "bold 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(s, 22, 138);

    // bottom corner
    c.save();
    c.translate(256, 356);
    c.rotate(Math.PI);
    c.fillStyle = suitColor;
    c.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(r, 22, 78);
    c.font = "bold 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(s, 22, 138);
    c.restore();

    // center suit
    c.fillStyle = suitColor;
    c.font = "bold 160px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(s, 92, 224);
  }

  function makeCardMesh(card, w = 0.30, h = 0.42) {
    const tex = new THREE.CanvasTexture(makeCardTexture(card));
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0x111111,
      emissiveIntensity: 0.10,
      transparent: true
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.y = Math.PI;
    return m;
  }

  function makeHoleCards(seed) {
    const group = new THREE.Group();

    const c1 = makeCardMesh(randCard(), 0.22, 0.32);
    const c2 = makeCardMesh(randCard(), 0.22, 0.32);

    c1.position.set(-0.14, 0.0, 0.0);
    c2.position.set( 0.14, 0.0, 0.0);

    group.add(c1, c2);

    return {
      group,
      setCards(a, b) {
        replaceCardMesh(group, 0, a, 0.22, 0.32, -0.14);
        replaceCardMesh(group, 1, b, 0.22, 0.32,  0.14);
      }
    };
  }

  function makeCommunityCards() {
    const group = new THREE.Group();
    group.scale.set(1.0, 1.0, 1.0);

    const cards = [];
    for (let i = 0; i < 5; i++) {
      const m = makeCardMesh(randCard(), 0.34, 0.48); // ✅ bigger than hole cards
      m.position.set((i - 2) * 0.42, 0, 0);
      m.visible = false;
      group.add(m);
      cards.push(m);
    }

    // tilt slightly toward viewer, billboard will face camera anyway
    group.rotation.x = -0.18;

    return {
      group,
      setVisibleCount(n) {
        for (let i = 0; i < 5; i++) cards[i].visible = i < n;
      }
    };
  }

  // ---------- table HUD ----------
  function makeTableHUD() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    drawHUD(canvas, "STREET: PREFLOP\nTURN: PLAYER 1\nPOT: $0");

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), mat);
    plane.renderOrder = 999;
    return plane;
  }

  function drawHUD(canvas, txt) {
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = "rgba(8,10,18,0.88)";
    roundRect(c, 12, 12, canvas.width - 24, canvas.height - 24, 26);
    c.fill();

    c.strokeStyle = "rgba(127,231,255,0.65)";
    c.lineWidth = 6;
    roundRect(c, 12, 12, canvas.width - 24, canvas.height - 24, 26);
    c.stroke();

    c.fillStyle = "rgba(255,45,122,0.22)";
    c.fillRect(26, 26, 14, canvas.height - 52);

    c.fillStyle = "#e8ecff";
    c.font = "bold 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const lines = txt.split("\n");
    for (let i = 0; i < lines.length; i++) {
      c.fillText(lines[i], 56, 78 + i * 60);
    }
  }

  // ---------- crown ----------
  function makeCrown() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.25, metalness: 0.9, emissive: 0x221100, emissiveIntensity: 0.25 });

    const base = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 10, 40), mat);
    base.rotation.x = Math.PI / 2;
    g.add(base);

    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 10), mat);
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(Math.sin(a) * 0.17, 0.10, Math.cos(a) * 0.17);
      spike.lookAt(0, 0.30, 0);
      g.add(spike);
    }
    return g;
  }

  // ---------- utils ----------
  function replaceCardMesh(group, index, card, w, h, x) {
    const old = group.children[index];
    if (old) {
      group.remove(old);
      old.geometry?.dispose?.();
      old.material?.map?.dispose?.();
      old.material?.dispose?.();
    }
    const m = makeCardMesh(card, w, h);
    m.position.set(x, 0, 0);
    group.add(m);

    // Ensure order: index 0 left, index 1 right
    if (group.children.length > 2) {
      // keep stable
    }
  }

  function randCard() {
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const s = suits[Math.floor(Math.random() * suits.length)];
    return { r, s };
  }

  function getCameraQuat() {
    // best-effort: use the scene camera if present
    // we can’t import camera here; pull from renderer XR camera via global hook would be bigger
    // So instead: billboard uses the scene’s active camera quaternion if available on window
    const cam = window?.__scarlettCamera;
    if (!cam) return null;
    return cam.getWorldQuaternion(new THREE.Quaternion());
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { init, update, state, getStackFor, getRankFor };
})();
