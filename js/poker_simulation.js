// js/poker_simulation.js — Poker Simulation (8.1.2)
// - Exports PokerSimulation + PokerSim alias (fixes your import error)
// - Shows: community cards (hovering), hole cards above bots (optional)
// - Bot actions: call/raise/fold with basic strength heuristic
// - Board (notification/leaderboard): shows action log + showdown winner + HAND TYPE
// - Crown: only one winner; floats higher, glows, then fades before next hand

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* ---------------------------
   Helpers: Canvas text plane
---------------------------- */
function makeCanvasTexture(w = 1024, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return { canvas: c, ctx, tex };
}

function drawBoard(ctx, canvas, title, lines) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // background
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, w, h);

  // neon border
  ctx.strokeStyle = "rgba(0,255,170,0.85)";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // title
  ctx.font = "bold 54px Arial";
  ctx.fillStyle = "rgba(0,255,170,0.95)";
  ctx.fillText(title, 40, 80);

  // lines
  ctx.font = "bold 40px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  let y = 145;
  for (const ln of lines.slice(0, 7)) {
    ctx.fillText(ln, 40, y);
    y += 55;
  }

  // footer hint
  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Spectator Mode • Bots Simulating", 40, h - 40);
}

/* ---------------------------
   Card rendering
---------------------------- */
const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_COLOR = { "♠": "#111", "♣": "#111", "♥": "#d11", "♦": "#d11" };
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function cardKey(card) {
  return `${card.rank}${card.suit}`;
}

function makeCardTexture(card, big = true) {
  const { canvas, ctx, tex } = makeCanvasTexture(512, 768);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // card body
  ctx.fillStyle = "rgba(245,245,245,1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // border
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // rank/suit big readable
  const r = card.rank;
  const s = card.suit;
  const col = SUIT_COLOR[s];

  ctx.fillStyle = col;
  ctx.font = big ? "bold 120px Arial" : "bold 90px Arial";
  ctx.fillText(r, 44, 140);

  ctx.font = big ? "bold 140px Arial" : "bold 110px Arial";
  ctx.fillText(s, 44, 270);

  // middle suit
  ctx.font = big ? "bold 240px Arial" : "bold 190px Arial";
  ctx.fillText(s, 170, 520);

  // bottom-right mirrored
  ctx.save();
  ctx.translate(canvas.width, canvas.height);
  ctx.rotate(Math.PI);
  ctx.fillStyle = col;
  ctx.font = big ? "bold 120px Arial" : "bold 90px Arial";
  ctx.fillText(r, 44, 140);
  ctx.font = big ? "bold 140px Arial" : "bold 110px Arial";
  ctx.fillText(s, 44, 270);
  ctx.restore();

  tex.needsUpdate = true;
  return tex;
}

function makeCardMesh(card) {
  const tex = makeCardTexture(card, true);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(0.55, 0.8);
  const m = new THREE.Mesh(geo, mat);
  m.userData.card = card;
  return m;
}

/* ---------------------------
   Hand evaluation (Texas Hold'em)
   Returns { rankName, rankValue, detail }
---------------------------- */
function rankToValue(r) {
  return RANKS.indexOf(r) + 2; // 2..14
}

function evaluate7(cards7) {
  // cards: [{rank,suit}, ...] length 7
  const values = cards7.map(c => rankToValue(c.rank)).sort((a,b)=>b-a);
  const suits = {};
  const counts = {};
  for (const c of cards7) {
    suits[c.suit] = (suits[c.suit]||0)+1;
    const v = rankToValue(c.rank);
    counts[v] = (counts[v]||0)+1;
  }

  // flush?
  let flushSuit = null;
  for (const s in suits) if (suits[s] >= 5) flushSuit = s;

  // straight helper (with wheel A-5)
  function straightHigh(vals) {
    const uniq = [...new Set(vals)].sort((a,b)=>b-a);
    // wheel
    if (uniq.includes(14)) uniq.push(1);
    for (let i=0; i<=uniq.length-5; i++) {
      const a = uniq[i];
      let ok = true;
      for (let k=1;k<5;k++) if (!uniq.includes(a-k)) { ok=false; break; }
      if (ok) return a;
    }
    return 0;
  }

  // straight flush?
  if (flushSuit) {
    const suited = cards7.filter(c=>c.suit===flushSuit).map(c=>rankToValue(c.rank));
    const sh = straightHigh(suited);
    if (sh) {
      const isRoyal = sh === 14;
      return { rankName: isRoyal ? "Royal Flush" : "Straight Flush", rankValue: 900 + sh, detail: `high ${sh}` };
    }
  }

  // quads
  const byCount = Object.entries(counts).map(([v,n])=>({v:+v,n})).sort((a,b)=>b.n-a.n||b.v-a.v);
  if (byCount[0].n === 4) {
    return { rankName: "Four of a Kind", rankValue: 800 + byCount[0].v, detail: `quad ${byCount[0].v}` };
  }

  // full house
  if (byCount[0].n === 3 && (byCount[1]?.n >= 2)) {
    return { rankName: "Full House", rankValue: 700 + byCount[0].v, detail: `trips ${byCount[0].v}` };
  }

  // flush
  if (flushSuit) {
    const top = cards7
      .filter(c=>c.suit===flushSuit)
      .map(c=>rankToValue(c.rank))
      .sort((a,b)=>b-a)
      .slice(0,5);
    const high = top[0];
    return { rankName: "Flush", rankValue: 600 + high, detail: `high ${high}` };
  }

  // straight
  const sh = straightHigh(values);
  if (sh) {
    return { rankName: "Straight", rankValue: 500 + sh, detail: `high ${sh}` };
  }

  // trips
  if (byCount[0].n === 3) {
    return { rankName: "Three of a Kind", rankValue: 400 + byCount[0].v, detail: `trips ${byCount[0].v}` };
  }

  // two pair
  if (byCount[0].n === 2 && byCount[1]?.n === 2) {
    const hi = Math.max(byCount[0].v, byCount[1].v);
    return { rankName: "Two Pair", rankValue: 300 + hi, detail: `top pair ${hi}` };
  }

  // pair
  if (byCount[0].n === 2) {
    return { rankName: "One Pair", rankValue: 200 + byCount[0].v, detail: `pair ${byCount[0].v}` };
  }

  // high card
  return { rankName: "High Card", rankValue: 100 + values[0], detail: `high ${values[0]}` };
}

/* ---------------------------
   PokerSim core
---------------------------- */
export const PokerSimulation = (() => {
  const S = {
    scene: null,
    opts: null,

    tableCenter: new THREE.Vector3(0, 0, -6.5),
    players: [],
    deck: [],
    community: [],
    pot: 0,
    dealerIndex: 0,
    turnIndex: 0,

    phase: "idle", // preflop/flop/turn/river/showdown/pause
    phaseTimer: 0,
    actionTimer: 0,

    // visuals
    group: null,
    boardPlane: null,
    boardTex: null,
    boardCtx: null,
    boardCanvas: null,

    commGroup: null,
    holeGroup: null,
    chipGroup: null,
    crownGroup: null,

    activeRing: null,

    lastLog: [],
    handId: 0,
    winner: null,
    crownTTL: 0,
  };

  function log(line) {
    S.lastLog.unshift(line);
    S.lastLog = S.lastLog.slice(0, 7);
    refreshBoard();
  }

  function refreshBoard(extraTitle) {
    if (!S.boardCtx) return;
    const title = extraTitle || `Poker Sim ${S.handId} — ${S.phase.toUpperCase()}`;
    drawBoard(S.boardCtx, S.boardCanvas, title, S.lastLog);
    S.boardTex.needsUpdate = true;
  }

  function buildBoard() {
    const { canvas, ctx, tex } = makeCanvasTexture(1024, 512);
    S.boardTex = tex;
    S.boardCtx = ctx;
    S.boardCanvas = canvas;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.8),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    plane.position.copy(S.tableCenter).add(new THREE.Vector3(0, S.opts.uiHoverY ?? 3.2, -5.5));
    plane.rotation.y = Math.PI; // face spawn direction
    plane.name = "NotificationBoard";
    S.boardPlane = plane;
    S.scene.add(plane);

    S.lastLog = [];
    refreshBoard("Poker Sim — Boot");
  }

  function buildBots() {
    S.players = [];
    const n = S.opts.playerCount ?? 5;
    const radius = 3.0;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const x = S.tableCenter.x + Math.cos(angle) * radius;
      const z = S.tableCenter.z + Math.sin(angle) * radius;

      const seat = new THREE.Group();
      seat.position.set(x, 0, z);
      seat.lookAt(S.tableCenter.x, 0.9, S.tableCenter.z);

      // tiny placeholder bot
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.55, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
      );
      body.position.y = 0.45;
      seat.add(body);

      // name tag (simple sprite plane)
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.28),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 })
      );
      tag.position.set(0, 1.25, 0);
      seat.add(tag);

      S.scene.add(seat);

      S.players.push({
        id: i,
        name: `Bot ${i + 1}`,
        chips: S.opts.startingChips ?? 20000,
        bet: 0,
        folded: false,
        seat,
        hole: [],
        strength: 0,
      });
    }
  }

  function buildGroups() {
    S.group = new THREE.Group();
    S.group.name = "PokerSimGroup";
    S.scene.add(S.group);

    S.commGroup = new THREE.Group();
    S.commGroup.name = "CommunityCards";
    S.scene.add(S.commGroup);

    S.holeGroup = new THREE.Group();
    S.holeGroup.name = "HoleCards";
    S.scene.add(S.holeGroup);

    S.chipGroup = new THREE.Group();
    S.chipGroup.name = "Chips";
    S.scene.add(S.chipGroup);

    S.crownGroup = new THREE.Group();
    S.crownGroup.name = "CrownFX";
    S.scene.add(S.crownGroup);

    // turn highlight ring (around table)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.55, 0.05, 10, 90),
      new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(S.tableCenter).add(new THREE.Vector3(0, 1.02, 0));
    ring.visible = false;
    ring.name = "TurnRing";
    S.activeRing = ring;
    S.scene.add(ring);
  }

  function buildPotStack() {
    // Clear pot visuals
    while (S.chipGroup.children.length) S.chipGroup.remove(S.chipGroup.children[0]);

    // Pot stack (simple cylinders)
    const stack = new THREE.Group();
    const denomColors = [0xffffff, 0x00ffaa, 0xff3366, 0x66aaff, 0xffcc00];
    const chipCount = Math.min(30, Math.floor(S.pot / 500) + 3);

    for (let i = 0; i < chipCount; i++) {
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.03, 22),
        new THREE.MeshStandardMaterial({
          color: denomColors[i % denomColors.length],
          roughness: 0.35,
          emissive: denomColors[i % denomColors.length],
          emissiveIntensity: 0.12,
        })
      );
      chip.rotation.x = Math.PI / 2;
      chip.position.set(0, 1.05 + i * 0.016, 0);
      stack.add(chip);
    }

    stack.position.copy(S.tableCenter);
    S.chipGroup.add(stack);
  }

  function buildDeck() {
    S.deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        S.deck.push({ suit, rank });
      }
    }
    // shuffle
    for (let i = S.deck.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [S.deck[i], S.deck[j]] = [S.deck[j], S.deck[i]];
    }
  }

  function dealCard() {
    return S.deck.pop();
  }

  function clearCards() {
    while (S.commGroup.children.length) S.commGroup.remove(S.commGroup.children[0]);
    while (S.holeGroup.children.length) S.holeGroup.remove(S.holeGroup.children[0]);
    S.community = [];
    for (const p of S.players) {
      p.hole = [];
      p.folded = false;
      p.bet = 0;
    }
  }

  function showCommunityCards() {
    while (S.commGroup.children.length) S.commGroup.remove(S.commGroup.children[0]);

    const y = S.opts.communityHoverY ?? 2.15;
    const startX = -1.2;
    for (let i = 0; i < S.community.length; i++) {
      const card = S.community[i];
      const mesh = makeCardMesh(card);
      mesh.position.copy(S.tableCenter).add(new THREE.Vector3(startX + i * 0.6, y, 0.25));
      mesh.rotation.x = -0.55; // tilt toward spectator
      mesh.rotation.y = Math.PI;
      S.commGroup.add(mesh);
    }
  }

  function showHoleCards() {
    if (!S.opts.showHoleCardsAboveHeads) return;
    while (S.holeGroup.children.length) S.holeGroup.remove(S.holeGroup.children[0]);

    for (const p of S.players) {
      if (p.folded) continue;
      const base = p.seat.position.clone();
      const up = 1.55;
      const spread = 0.33;

      for (let i = 0; i < p.hole.length; i++) {
        const mesh = makeCardMesh(p.hole[i]);
        mesh.position.set(base.x + (i === 0 ? -spread : spread), up, base.z);
        mesh.lookAt(S.tableCenter.x, up, S.tableCenter.z);
        mesh.rotateY(Math.PI); // face outward
        S.holeGroup.add(mesh);
      }
    }
  }

  function setTurnHighlight(player) {
    if (!S.opts.showTurnHighlight) return;
    S.activeRing.visible = true;
    S.activeRing.position.copy(S.tableCenter).add(new THREE.Vector3(0, 1.02, 0));
    // small pulse
    const t = performance.now() * 0.001;
    const pulse = 0.55 + Math.sin(t * 6) * 0.35;
    S.activeRing.material.emissiveIntensity = pulse;
  }

  function crownWinner(player) {
    // Clear existing crowns
    while (S.crownGroup.children.length) S.crownGroup.remove(S.crownGroup.children[0]);

    const crown = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.05, 10, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 1.25,
        roughness: 0.25,
      })
    );
    ring.rotation.x = Math.PI / 2;

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 1.1,
      roughness: 0.3,
    });

    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), spikeMat);
      const a = (i / 6) * Math.PI * 2;
      sp.position.set(Math.cos(a) * 0.18, 0.12, Math.sin(a) * 0.18);
      crown.add(sp);
    }

    crown.add(ring);

    const pos = player.seat.position.clone();
    crown.position.set(pos.x, 2.2, pos.z); // higher than before
    crown.name = "WinnerCrown";
    S.crownGroup.add(crown);

    S.crownTTL = (S.opts.handPauseSeconds ?? 60);
  }

  function botStrength(p) {
    // very basic heuristic: pocket pair + high cards
    const a = rankToValue(p.hole[0].rank);
    const b = rankToValue(p.hole[1].rank);
    const pair = p.hole[0].rank === p.hole[1].rank ? 12 : 0;
    const high = Math.max(a, b);
    return pair + high + (Math.random() * 3);
  }

  function decideAction(p, toCall) {
    // simplistic decision based on strength + randomness
    const s = p.strength;
    if (p.folded) return { type: "fold", amount: 0 };

    // if very weak and cost > 0, fold sometimes
    if (toCall > 0 && s < 10 && Math.random() < 0.55) return { type: "fold", amount: 0 };

    // raise chance on strong
    if (s > 15 && Math.random() < 0.55) {
      const raise = Math.min(p.chips, toCall + (500 + ((Math.random() * 1500) | 0)));
      return { type: "raise", amount: raise };
    }

    // otherwise call/check
    const call = Math.min(p.chips, toCall);
    return { type: toCall > 0 ? "call" : "check", amount: call };
  }

  function applyAction(p, action) {
    if (action.type === "fold") {
      p.folded = true;
      log(`${p.name} folds`);
      return;
    }

    if (action.type === "check") {
      log(`${p.name} checks`);
      return;
    }

    if (action.type === "call") {
      const amt = action.amount;
      p.chips -= amt;
      p.bet += amt;
      S.pot += amt;
      log(`${p.name} calls ${amt}`);
      return;
    }

    if (action.type === "raise") {
      const amt = action.amount;
      p.chips -= amt;
      p.bet += amt;
      S.pot += amt;
      log(`${p.name} raises ${amt}`);
      return;
    }
  }

  function livingPlayers() {
    return S.players.filter(p => !p.folded && p.chips > 0);
  }

  function showdown() {
    const alive = livingPlayers();
    if (alive.length === 0) {
      S.winner = null;
      log("All players folded? Resetting…");
      return;
    }

    let best = null;
    let bestEval = null;

    for (const p of alive) {
      const eval7 = evaluate7([...p.hole, ...S.community]);
      if (!bestEval || eval7.rankValue > bestEval.rankValue) {
        best = p;
        bestEval = eval7;
      }
    }

    // Winner takes pot
    best.chips += S.pot;
    const won = S.pot;
    S.pot = 0;

    S.winner = best;
    crownWinner(best);

    log(`🏆 ${best.name} wins ${won}`);
    log(`✅ Hand: ${bestEval.rankName}`);

    refreshBoard(`SHOWDOWN — ${best.name}: ${bestEval.rankName}`);
  }

  function startHand() {
    S.handId++;
    S.phase = "preflop";
    S.phaseTimer = 0;
    S.actionTimer = 0;
    S.pot = 0;
    S.winner = null;

    // remove crown
    while (S.crownGroup.children.length) S.crownGroup.remove(S.crownGroup.children[0]);
    S.crownTTL = 0;

    clearCards();
    buildDeck();

    // deal hole
    for (const p of S.players) {
      p.hole = [dealCard(), dealCard()];
      p.strength = botStrength(p);
      p.folded = false;
      p.bet = 0;
    }

    // community will come later
    S.community = [];

    log(`New hand #${S.handId}`);
    log(`Dealer: Bot ${(S.dealerIndex % S.players.length) + 1}`);

    showHoleCards();
    showCommunityCards();
    buildPotStack();
    refreshBoard();
  }

  function nextPhase() {
    if (S.phase === "preflop") {
      S.phase = "flop";
      S.community.push(dealCard(), dealCard(), dealCard());
      log("— FLOP —");
    } else if (S.phase === "flop") {
      S.phase = "turn";
      S.community.push(dealCard());
      log("— TURN —");
    } else if (S.phase === "turn") {
      S.phase = "river";
      S.community.push(dealCard());
      log("— RIVER —");
    } else if (S.phase === "river") {
      S.phase = "showdown";
      log("— SHOWDOWN —");
    } else if (S.phase === "showdown") {
      S.phase = "pause";
      log(`Winner walking… (pause ${S.opts.handPauseSeconds ?? 60}s)`);
    } else if (S.phase === "pause") {
      // rotate dealer
      S.dealerIndex = (S.dealerIndex + 1) % S.players.length;
      startHand();
      return;
    }

    // refresh visuals
    showCommunityCards();
    showHoleCards();
    buildPotStack();
    refreshBoard();
  }

  function stepActions(dt) {
    // A quick action loop per phase
    S.actionTimer += dt;

    // Make it readable (not too fast)
    const speed = 0.75; // seconds per action
    if (S.actionTimer < speed) return;
    S.actionTimer = 0;

    const alive = livingPlayers();
    if (alive.length <= 1) {
      // everyone folded
      const winner = alive[0] || null;
      if (winner) {
        winner.chips += S.pot;
        log(`🏆 ${winner.name} wins ${S.pot} (all folded)`);
        S.pot = 0;
        crownWinner(winner);
        refreshBoard(`WIN — ${winner.name}`);
      }
      S.phase = "pause";
      return;
    }

    // pick next active player for action
    const p = S.players[S.turnIndex % S.players.length];
    S.turnIndex++;

    if (p.folded || p.chips <= 0) return;

    setTurnHighlight(p);

    // determine current toCall based on max bet
    const maxBet = Math.max(...S.players.map(x => x.bet));
    const toCall = Math.max(0, maxBet - p.bet);

    const action = decideAction(p, toCall);
    applyAction(p, action);

    buildPotStack();
    refreshBoard();
  }

  function updatePause(dt) {
    if (S.crownTTL > 0) {
      S.crownTTL -= dt;

      // glow pulse and float
      const crown = S.crownGroup.getObjectByName("WinnerCrown");
      if (crown) {
        const t = performance.now() * 0.001;
        crown.position.y = 2.35 + Math.sin(t * 3.0) * 0.08;
        crown.rotation.y += dt * 0.9;

        // fade near end
        const fadeStart = 6;
        if (S.crownTTL < fadeStart) {
          const a = Math.max(0, S.crownTTL / fadeStart);
          crown.traverse(obj => {
            if (obj.material) {
              obj.material.transparent = true;
              obj.material.opacity = a;
            }
          });
        }
      }

      if (S.crownTTL <= 0) {
        // remove crown before next hand starts
        while (S.crownGroup.children.length) S.crownGroup.remove(S.crownGroup.children[0]);
      }
    }

    // move to next hand after pause
    S.phaseTimer += dt;
    const pauseLen = (S.opts.handPauseSeconds ?? 60);
    if (S.phaseTimer >= pauseLen) {
      S.phaseTimer = 0;
      nextPhase(); // pause -> new hand
    }
  }

  function update(dt, camera) {
    if (!S.scene) return;

    // Keep board facing camera for readability
    if (S.boardPlane && camera) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      S.boardPlane.lookAt(camPos.x, camPos.y, camPos.z);
      S.boardPlane.rotateY(Math.PI); // flip so text is not mirrored
    }

    if (S.phase === "idle") return;

    if (S.phase === "pause") {
      updatePause(dt);
      return;
    }

    // Each betting phase runs for a few actions, then advances
    S.phaseTimer += dt;

    // Run action steps
    stepActions(dt);

    // Advance phase after some time
    const phaseLen =
      (S.phase === "preflop") ? 7.0 :
      (S.phase === "flop") ? 6.5 :
      (S.phase === "turn") ? 6.0 :
      (S.phase === "river") ? 6.0 :
      3.0;

    if (S.phaseTimer >= phaseLen) {
      S.phaseTimer = 0;

      if (S.phase === "showdown") {
        showdown();
        nextPhase(); // showdown -> pause
      } else {
        // Reset bets each street for readability
        for (const p of S.players) p.bet = 0;
        nextPhase();
      }
    }
  }

  function init(scene, opts = {}) {
    S.scene = scene;
    S.opts = opts;

    S.tableCenter = opts.tableCenter ? opts.tableCenter.clone() : new THREE.Vector3(0, 0, -6.5);

    buildGroups();
    buildBoard();
    buildBots();

    S.dealerIndex = 0;
    S.turnIndex = 0;

    S.phase = "idle";
    S.handId = 0;

    log("PokerSim ready ✅");
    startHand();
  }

  return { init, update };
})();

// ✅ Compatibility export (fixes your import error)
export const PokerSim = PokerSimulation;
