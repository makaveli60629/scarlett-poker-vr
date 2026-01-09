// /js/dealingMix.js — Scarlett DealingMix v1.2 (TABLE-CENTERED, UNIQUE 52, BILLBOARD)
// Exports: DealingMix
// - Builds a real 52-card deck (no duplicates)
// - Deals hole cards to SEATED bots (found by name SeatedBot_*)
// - Community cards hover above table and face the player
// - Does NOT depend on bots.js internals; it finds bots in the scene
// - Hides bots' built-in HoleCards if present (to avoid double-games)

export const DealingMix = (() => {
  let THREE, scene, world, log;
  let cameraRef = null;

  const state = {
    t: 0,
    running: false,
    roundT: 0,

    deck: [],
    used: new Set(),

    // visuals
    root: null,
    community: [],
    holeByBot: new Map(), // bot.uuid -> Group

    // gameplay info for HUD text
    handNo: 0,
    pot: 0,
    turnName: "—",
    tableName: "$10,000 Table",
    phase: "Waiting",
  };

  const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const SUITS = ["♠","♥","♦","♣"];

  function L(...a){ try { log?.(...a); } catch { console.log(...a); } }

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

  function makeCardFaceTexture(rank, suit) {
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

    // corners
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

    // center suit
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 140px Arial";
    ctx.fillText(suit, c.width / 2, c.height / 2 + 10);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function makeCardMesh({ rank="A", suit="♠", backColor=0xff2d7a } = {}) {
    const g = new THREE.Group();
    g.name = "ScarlettCard";

    const geo = new THREE.PlaneGeometry(0.22, 0.31);

    const faceMat = new THREE.MeshStandardMaterial({
      map: makeCardFaceTexture(rank, suit),
      roughness: 0.55,
      metalness: 0.0,
      emissive: 0x111111,
      emissiveIntensity: 0.22,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const backMat = new THREE.MeshStandardMaterial({
      color: backColor,
      roughness: 0.55,
      metalness: 0.0,
      emissive: 0x220010,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const face = new THREE.Mesh(geo, faceMat);
    const back = new THREE.Mesh(geo, backMat);
    face.position.z = 0.002;
    back.position.z = -0.002;
    back.rotation.y = Math.PI;

    // render-order so it stays readable
    face.renderOrder = 25;
    back.renderOrder = 24;

    g.add(face, back);
    return g;
  }

  function resetDeck() {
    state.deck.length = 0;
    state.used.clear();

    for (const s of SUITS) {
      for (const r of RANKS) {
        state.deck.push({ r, s, key: r + s });
      }
    }

    // Fisher–Yates shuffle (Math.random is fine for visuals)
    for (let i = state.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
  }

  function drawCard() {
    for (let i = 0; i < state.deck.length; i++) {
      const c = state.deck.pop();
      if (!c) break;
      if (state.used.has(c.key)) continue;
      state.used.add(c.key);
      return c;
    }
    // fallback: rebuild if depleted
    resetDeck();
    return drawCard();
  }

  function getTableAnchor() {
    // Prefer world.table if it exists
    const table = world?.table || world?.group || scene;
    const TABLE_Y = (world?.metrics?.tableY ?? 0.92);
    const focus = world?.tableFocus || new THREE.Vector3(0,0,-6.5);
    return { table, focus, TABLE_Y };
  }

  function billboard(obj) {
    if (!obj) return;
    const ref = cameraRef || world?.camera || null;
    if (!ref) return;
    const p = ref.position.clone();
    obj.lookAt(p.x, obj.position.y, p.z);
  }

  function findSeatedBots() {
    const bots = [];
    (world?.group || scene).traverse((o) => {
      if (!o) return;
      if (typeof o.name === "string" && o.name.startsWith("SeatedBot_")) bots.push(o);
    });
    // sort by index in name if possible
    bots.sort((a,b) => {
      const ai = parseInt(a.name.split("_")[1] || "0", 10);
      const bi = parseInt(b.name.split("_")[1] || "0", 10);
      return ai - bi;
    });
    return bots;
  }

  function hideBuiltInHoleCards(bot) {
    // bots.js puts "HoleCards" group on bot
    bot.traverse((o) => {
      if (o?.name === "HoleCards") o.visible = false;
    });
  }

  function clearVisuals() {
    // remove old hole groups
    for (const g of state.holeByBot.values()) {
      try { g.parent?.remove(g); } catch {}
    }
    state.holeByBot.clear();

    // community
    for (const c of state.community) {
      try { c.parent?.remove(c); } catch {}
    }
    state.community.length = 0;
  }

  function buildCommunity() {
    const { table, TABLE_Y } = getTableAnchor();
    const y = TABLE_Y + 0.38; // hover above table
    const baseX = -0.62;
    const step = 0.32;

    for (let i = 0; i < 5; i++) {
      const d = drawCard();
      const card = makeCardMesh({ rank: d.r, suit: d.s, backColor: 0x7fe7ff });
      card.name = "Community_" + i;

      card.position.set(baseX + i * step, y, 0.02);
      card.rotation.x = -Math.PI / 2; // start flat
      card.scale.setScalar(1.0);

      table.add(card);
      state.community.push(card);
    }
  }

  function buildHoleForBots() {
    const { TABLE_Y } = getTableAnchor();
    const bots = findSeatedBots();
    if (!bots.length) return;

    // give each bot 2 unique cards
    for (const bot of bots) {
      hideBuiltInHoleCards(bot);

      const g = new THREE.Group();
      g.name = "DealHoleGroup";

      const c1 = drawCard();
      const c2 = drawCard();

      const m1 = makeCardMesh({ rank: c1.r, suit: c1.s, backColor: 0xff2d7a });
      const m2 = makeCardMesh({ rank: c2.r, suit: c2.s, backColor: 0xff2d7a });

      m1.position.set(-0.13, 0, 0);
      m2.position.set( 0.13, 0, 0);

      g.add(m1, m2);

      // above head (bots are ~1.7-2m tall)
      g.position.set(0, 2.05, 0);
      g.rotation.x = 0; // billboard handles
      g.scale.setScalar(1.0);

      bot.add(g);
      state.holeByBot.set(bot.uuid, g);

      // store label for "turn"
      bot.userData.displayName = bot.userData.displayName || bot.name.replace("SeatedBot_","");
    }

    // init simple “turn”
    state.turnName = (bots[0]?.name || "BOT").replace("SeatedBot_","BOT ");
    state.pot = 150;
    state.phase = "Preflop";
  }

  function startHand() {
    if (!THREE) return;
    state.handNo++;
    state.roundT = 0;
    state.running = true;

    clearVisuals();
    resetDeck();
    buildCommunity();
    buildHoleForBots();

    L("[DealingMix] startHand ✅ #" + state.handNo);
  }

  function tick(dt) {
    state.t += dt;
    if (!state.running) return;
    state.roundT += dt;

    // hover / face player
    for (let i = 0; i < state.community.length; i++) {
      const c = state.community[i];
      if (!c) continue;

      // keep hovering and face the camera (not flat)
      const bob = Math.sin(state.t * 2.1 + i) * 0.025;
      c.position.y = (world?.metrics?.tableY ?? 0.92) + 0.38 + bob;

      billboard(c);

      // size control: make community cards bigger than hole cards
      c.scale.setScalar(1.55);
    }

    // hole cards: face player and hover
    for (const g of state.holeByBot.values()) {
      if (!g) continue;
      g.position.y = 2.05 + Math.sin(state.t * 2.0) * 0.03;
      billboard(g);
      g.scale.setScalar(1.15);
    }

    // simple rotating turn / pot text for HUD
    if (state.roundT > 2.5) {
      state.roundT = 0;
      const bots = findSeatedBots();
      if (bots.length) {
        const idx = Math.floor(Math.random() * bots.length);
        state.turnName = (bots[idx].name || "BOT").replace("SeatedBot_","BOT ");
      }
      const delta = 25 + Math.floor(Math.random() * 90);
      state.pot += delta;
      state.phase = ["Preflop","Flop","Turn","River"][Math.floor(Math.random()*4)];
    }

    // expose info to world (HUD can read)
    if (world) {
      world.game = world.game || {};
      world.game.tableName = state.tableName;
      world.game.pot = state.pot;
      world.game.turn = state.turnName;
      world.game.phase = state.phase;
    }
  }

  return {
    init({ THREE: _THREE, scene: _scene, world: _world, log: _log, camera } = {}) {
      THREE = _THREE;
      scene = _scene;
      world = _world;
      log = _log || console.log;
      cameraRef = camera || null;

      if (state.root) { try { scene.remove(state.root); } catch {} }
      state.root = new THREE.Group();
      state.root.name = "DealingMixRoot";
      scene.add(state.root);

      state.running = false;
      state.handNo = 0;
      state.pot = 0;
      state.turnName = "—";
      state.phase = "Waiting";

      L("[DealingMix] init ✅");
      return {
        startHand,
        update: tick,
        getState: () => ({ ...state })
      };
    }
  };
})();
