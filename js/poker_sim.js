// /js/poker_sim.js — PokerSim v4 (FULL)
// Watchable visuals: cards + chips stacks + basic betting loop.
// Not full poker rules; it’s a development-ready simulation with seat/chips/bets.

export const PokerSim = {
  init(ctx) {
    const { THREE, scene, log } = ctx;

    const state = {
      mode: "lobby_demo",
      tables: {
        lobby: makeTableVisual(ctx, new THREE.Vector3(0, 0, 0), "LOBBY TABLE", 8),
        scorpion: makeTableVisual(ctx, new THREE.Vector3(8.0, 0, 0), "SCORPION TABLE ($100 MIN)", 3),
      },
      players: {},
      running: true,
    };

    // bankroll config
    const BANK = {
      player: 50000,
      bot: 10000,
      scorpionMinBet: 100,
    };

    // Set up seats
    seedLobbyBots(ctx, state, 8);
    seedScorpionBots(ctx, state, 2); // two bots play until you join

    // seat/join events
    window.addEventListener("scarlett-seat", (e) => {
      const d = e?.detail || {};
      if (d.table !== "scorpion") return;
      joinPlayerToScorpion(ctx, state, BANK);
    });

    // allow mode switch
    ctx.PokerSim = {
      setMode: (m) => (state.mode = m),
      ensureScorpionMatch: () => ensureScorpionBots(ctx, state, BANK),
    };

    // main loop: deal/bet cycles
    let t = 0;
    function tick(dt) {
      if (!state.running) return;
      t += dt;

      // Every ~6 seconds run a quick hand
      if (t > 6.0) {
        t = 0;
        if (state.mode === "lobby_demo") runHand(ctx, state, "lobby", { minBet: 50 });
        if (state.mode === "scorpion_match") runHand(ctx, state, "scorpion", { minBet: BANK.scorpionMinBet });
      }
    }

    // hook into renderer loop if exists, else create a lightweight timer
    if (!ctx.__simTimer) {
      ctx.__simTimer = setInterval(() => tick(0.25), 250);
    }

    log?.("[PokerSim] init ✅ visual loop");
    return ctx.PokerSim;
  }
};

function makeTableVisual(ctx, pos, label, seats) {
  const { THREE, scene } = ctx;
  const group = new THREE.Group();
  group.position.copy(pos);
  group.name = label.replace(/\s+/g, "_");
  scene.add(group);

  // Felt
  const felt = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b4d2d, roughness: 0.95 })
  );
  felt.rotation.x = -Math.PI / 2;
  felt.receiveShadow = true;
  group.add(felt);

  // Rail ring
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.11, 18, 90),
    new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.8 })
  );
  rail.rotation.x = -Math.PI / 2;
  rail.position.y = 0.08;
  group.add(rail);

  // Sign
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.55),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
  );
  sign.position.set(0, 1.35, -2.0);
  sign.rotation.y = Math.PI;
  group.add(sign);

  // Seats
  const seatPoints = [];
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2;
    seatPoints.push(new THREE.Vector3(Math.sin(a) * 2.0, 0, Math.cos(a) * 2.0));
  }

  return { group, felt, rail, seatPoints, cards: [], chips: [] };
}

function seedLobbyBots(ctx, state, n) {
  state.players.lobby = [];
  for (let i = 0; i < n; i++) {
    state.players.lobby.push({ id: `bot_l_${i}`, type: "bot", chips: 10000 });
  }
}

function seedScorpionBots(ctx, state, n) {
  state.players.scorpion = [];
  for (let i = 0; i < n; i++) {
    state.players.scorpion.push({ id: `bot_s_${i}`, type: "bot", chips: 10000 });
  }
  // seat 2 bots automatically
  state.players.scorpion.forEach((p, idx) => (p.seat = idx + 1)); // seats 1 and 2
}

function ensureScorpionBots(ctx, state, BANK) {
  const ps = state.players.scorpion || [];
  while (ps.filter(p => p.type === "bot").length < 2) {
    const id = `bot_s_${Math.floor(Math.random() * 9999)}`;
    ps.push({ id, type: "bot", chips: BANK.bot, seat: ps.length + 1 });
  }
}

function joinPlayerToScorpion(ctx, state, BANK) {
  const ps = state.players.scorpion;
  const already = ps.find(p => p.type === "player");
  if (already) return;

  ps.push({ id: "player", type: "player", chips: BANK.player, seat: 0 });
  ctx.log?.("[PokerSim] ✅ player joined scorpion with $50,000");
}

function runHand(ctx, state, tableName, { minBet }) {
  const { THREE } = ctx;
  const table = state.tables[tableName];
  if (!table) return;

  // clear last visuals
  table.cards.forEach(m => m.parent && m.parent.remove(m));
  table.chips.forEach(m => m.parent && m.parent.remove(m));
  table.cards = [];
  table.chips = [];

  const players = (state.players[tableName] || []).slice();

  // if scorpion and no player yet: let 2 bots play each other
  if (tableName === "scorpion") {
    const bots = players.filter(p => p.type === "bot").slice(0, 2);
    const pl = players.find(p => p.type === "player");
    if (!pl) players.splice(0, players.length, ...bots);
  }

  if (players.length < 2) return;

  // deal 2 cards per player (visual)
  players.forEach((p, i) => {
    const seat = (p.seat ?? i) % table.seatPoints.length;
    const seatPos = table.seatPoints[seat].clone().add(table.group.position);

    for (let c = 0; c < 2; c++) {
      const card = makeCard(ctx);
      card.position.copy(table.group.position);
      card.position.y = 0.12 + c * 0.01;
      // slide toward seat
      card.userData.target = seatPos.clone().setY(0.12);
      table.group.add(card);
      table.cards.push(card);
    }
  });

  // pot chips (visual)
  const pot = makeChipStack(ctx, 12);
  pot.position.copy(table.group.position);
  pot.position.y = 0.11;
  table.group.add(pot);
  table.chips.push(pot);

  // “bet” subtract chips
  players.forEach(p => {
    const bet = Math.min(minBet, p.chips);
    p.chips -= bet;
  });

  // animate quick (simple lerp timer)
  animateCards(table.cards);

  ctx.log?.(`[PokerSim] hand ✅ table=${tableName} minBet=$${minBet} players=${players.length}`);
}

function makeCard(ctx) {
  const { THREE } = ctx;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

function makeChipStack(ctx, n = 10) {
  const { THREE } = ctx;
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const chip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.012, 24),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.35, metalness: 0.15 })
    );
    chip.position.y = i * 0.013;
    g.add(chip);
  }
  return g;
}

function animateCards(cards) {
  const start = performance.now();
  const dur = 700;

  function step() {
    const t = Math.min(1, (performance.now() - start) / dur);
    cards.forEach((c) => {
      const target = c.userData.target;
      if (!target) return;
      c.position.lerp(target, 0.08 + 0.1 * t);
    });
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
