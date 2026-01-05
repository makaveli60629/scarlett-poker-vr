// js/poker_simulation.js — Boss Bots Poker Sim (8.2)
// FEATURES (All 3):
// 1) Leaderboard data: emits hand_end payload with winner + hand rank name + pot + standings
// 2) Crown rules: ONLY winner gets crown; crown rises, shines; disappears at next hand start
//    Winner does a 60s "victory lap" then returns; new game starts after lap.
// 3) Dealer invisible: NO dealer marker mesh. (If any older marker exists, we hide it safely)
//    Community cards hover large in center, facing player; pot/action signage higher + larger.
// SAFE: no external deps, no crashes if missing textures, GitHub-friendly imports.

import * as THREE from "./three.js";

/* -----------------------------
   Tiny event bus
------------------------------ */
function makeEmitter() {
  const map = new Map();
  return {
    on(evt, fn) {
      if (!map.has(evt)) map.set(evt, new Set());
      map.get(evt).add(fn);
    },
    off(evt, fn) {
      map.get(evt)?.delete(fn);
    },
    emit(evt, payload) {
      map.get(evt)?.forEach((fn) => {
        try { fn(payload); } catch (e) { /* never crash sim */ }
      });
    },
  };
}

/* -----------------------------
   Card helpers
------------------------------ */
const SUITS = [
  { k: "S", name: "Spades",  color: "#ffffff", pip: "♠" },
  { k: "H", name: "Hearts",  color: "#ff3c78", pip: "♥" },
  { k: "D", name: "Diamonds",color: "#ff3c78", pip: "♦" },
  { k: "C", name: "Clubs",   color: "#ffffff", pip: "♣" },
];
const RANKS = [
  { v: 2,  s: "2" }, { v: 3,  s: "3" }, { v: 4,  s: "4" }, { v: 5,  s: "5" },
  { v: 6,  s: "6" }, { v: 7,  s: "7" }, { v: 8,  s: "8" }, { v: 9,  s: "9" },
  { v: 10, s: "10" },{ v: 11, s: "J" }, { v: 12, s: "Q" }, { v: 13, s: "K" },
  { v: 14, s: "A" },
];
function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r: r.v, rs: r.s, s: s.k, pip: s.pip, color: s.color });
  return deck;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -----------------------------
   5-card evaluator + best of 7
   Returns { cat, name, kickers[] } where higher cat better.
   cat scale: 8 SF, 7 4K, 6 FH, 5 F, 4 S, 3 3K, 2 2P, 1 1P, 0 HC
------------------------------ */
function eval5(cards) {
  const ranks = cards.map(c => c.r).sort((a,b)=>b-a);
  const suits = cards.map(c => c.s);
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r)||0)+1);

  // flush?
  const flush = suits.every(s => s === suits[0]);

  // straight?
  const uniq = [...new Set(ranks)].sort((a,b)=>b-a);
  let straightHigh = null;
  // wheel A-5
  const wheel = [14,5,4,3,2];
  const isWheel = wheel.every(v => uniq.includes(v));
  if (isWheel) straightHigh = 5;
  else {
    for (let i=0;i<=uniq.length-5;i++){
      const slice = uniq.slice(i,i+5);
      if (slice[0]-slice[4]===4) { straightHigh = slice[0]; break; }
    }
  }

  // sort groups by count then rank
  const groups = [...counts.entries()].map(([r,c])=>({r, c})).sort((a,b)=> (b.c-a.c) || (b.r-a.r));
  const pattern = groups.map(g=>g.c).join("");

  const kickersFromGroups = () => {
    const out = [];
    for (const g of groups) for (let k=0;k<g.c;k++) out.push(g.r);
    return out;
  };

  if (straightHigh && flush) {
    return { cat: 8, name: "Straight Flush", kickers: [straightHigh] };
  }
  if (pattern === "41") {
    return { cat: 7, name: "Four of a Kind", kickers: kickersFromGroups() };
  }
  if (pattern === "32") {
    return { cat: 6, name: "Full House", kickers: kickersFromGroups() };
  }
  if (flush) {
    return { cat: 5, name: "Flush", kickers: ranks };
  }
  if (straightHigh) {
    return { cat: 4, name: "Straight", kickers: [straightHigh] };
  }
  if (pattern === "311") {
    return { cat: 3, name: "Three of a Kind", kickers: kickersFromGroups() };
  }
  if (pattern === "221") {
    return { cat: 2, name: "Two Pair", kickers: kickersFromGroups() };
  }
  if (pattern === "2111") {
    return { cat: 1, name: "One Pair", kickers: kickersFromGroups() };
  }
  return { cat: 0, name: "High Card", kickers: ranks };
}

function compareEval(a,b){
  if (a.cat !== b.cat) return a.cat - b.cat;
  const len = Math.max(a.kickers.length, b.kickers.length);
  for (let i=0;i<len;i++){
    const av = a.kickers[i]||0;
    const bv = b.kickers[i]||0;
    if (av!==bv) return av-bv;
  }
  return 0;
}

function bestOf7(cards7){
  let best = null;
  for (let a=0;a<7;a++) for (let b=a+1;b<7;b++) for (let c=b+1;c<7;c++)
    for (let d=c+1;d<7;d++) for (let e=d+1;e<7;e++){
      const hand = [cards7[a],cards7[b],cards7[c],cards7[d],cards7[e]];
      const r = eval5(hand);
      if (!best || compareEval(r,best)>0) best = r;
    }
  return best;
}

/* -----------------------------
   Card texture (big rank + suit)
------------------------------ */
function makeCardTexture(card, faceUp=true) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = faceUp ? "rgba(245,248,255,1)" : "rgba(20,22,30,1)";
  ctx.fillRect(0,0,512,768);

  // border
  ctx.strokeStyle = faceUp ? "rgba(10,12,18,0.9)" : "rgba(0,255,170,0.7)";
  ctx.lineWidth = 16;
  ctx.strokeRect(18,18,512-36,768-36);

  if (!faceUp) {
    // back pattern
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(0,255,170,0.9)";
    for (let y=80;y<720;y+=56){
      ctx.beginPath(); ctx.moveTo(60,y); ctx.lineTo(452,y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // rank + suit big
  ctx.fillStyle = card.color;
  ctx.font = "900 120px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(card.rs, 52, 150);

  ctx.font = "900 120px system-ui";
  ctx.fillText(card.pip, 52, 260);

  // center suit
  ctx.textAlign = "center";
  ctx.font = "900 260px system-ui";
  ctx.globalAlpha = 0.95;
  ctx.fillText(card.pip, 256, 520);
  ctx.globalAlpha = 1;

  // mirrored bottom-right
  ctx.save();
  ctx.translate(512,768);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.font = "900 120px system-ui";
  ctx.fillText(card.rs, 52, 150);
  ctx.font = "900 120px system-ui";
  ctx.fillText(card.pip, 52, 260);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCardMesh(card, faceUp=true) {
  const tex = makeCardTexture(card, faceUp);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const geo = new THREE.PlaneGeometry(0.35, 0.52);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10;
  return mesh;
}

/* -----------------------------
   Text label (sprite-like plane)
------------------------------ */
function makeLabel(text, opts = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const bg = opts.bg ?? "rgba(10,12,18,0.75)";
  const stroke1 = opts.stroke1 ?? "rgba(0,255,170,0.75)";
  const stroke2 = opts.stroke2 ?? "rgba(255,60,120,0.75)";
  const fg = opts.fg ?? "rgba(255,255,255,0.95)";
  const title = opts.title ?? "";

  ctx.clearRect(0,0,1024,256);
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,1024,256);

  ctx.lineWidth = 14;
  ctx.strokeStyle = stroke1;
  ctx.strokeRect(18,18,1024-36,256-36);

  ctx.lineWidth = 8;
  ctx.strokeStyle = stroke2;
  ctx.strokeRect(34,34,1024-68,256-68);

  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.font = "900 52px system-ui";
  if (title) ctx.fillText(title, 60, 90);

  ctx.font = "900 72px system-ui";
  ctx.fillText(text, 60, title ? 175 : 155);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), mat);
  plane.userData._canvas = canvas;
  plane.userData._ctx = ctx;
  plane.userData._tex = tex;
  plane.userData._opts = opts;
  plane.renderOrder = 20;

  plane.userData.setText = (newText, newTitle) => {
    const o = plane.userData._opts;
    const ctx2 = plane.userData._ctx;
    ctx2.clearRect(0,0,1024,256);
    ctx2.fillStyle = o.bg ?? "rgba(10,12,18,0.75)";
    ctx2.fillRect(0,0,1024,256);

    ctx2.lineWidth = 14; ctx2.strokeStyle = o.stroke1 ?? "rgba(0,255,170,0.75)";
    ctx2.strokeRect(18,18,1024-36,256-36);

    ctx2.lineWidth = 8; ctx2.strokeStyle = o.stroke2 ?? "rgba(255,60,120,0.75)";
    ctx2.strokeRect(34,34,1024-68,256-68);

    ctx2.fillStyle = o.fg ?? "rgba(255,255,255,0.95)";
    ctx2.textAlign = "left";
    ctx2.font = "900 52px system-ui";
    const t = (newTitle != null ? newTitle : (o.title ?? ""));
    if (t) ctx2.fillText(t, 60, 90);

    ctx2.font = "900 72px system-ui";
    ctx2.fillText(newText, 60, t ? 175 : 155);

    plane.userData._tex.needsUpdate = true;
  };

  return plane;
}

/* -----------------------------
   Poker Simulation Core
------------------------------ */
export const PokerSimulation = {
  _em: makeEmitter(),

  scene: null,
  center: new THREE.Vector3(0, 0, -6.5),

  // 6 bots, each starts 20,000
  bots: [],
  botCount: 6,
  startStack: 20000,

  // hand state
  handNumber: 0,
  maxHands: 10,
  deck: [],
  pot: 0,
  community: [],
  stage: "idle", // idle | deal | preflop | flop | turn | river | showdown | victory
  stageT: 0,
  actingIndex: 0,

  // visuals
  group: null,
  communityGroup: null,
  infoLabel: null,      // pot + action (big)
  lastWinLabel: null,   // winner + hand rank (big)
  crown: null,
  crownOwner: null,
  crownT: 0,

  // dealer invisible marker support
  _hiddenDealer: false,

  // leaderboard summary
  wins: {},

  // public API
  on(evt, fn){ this._em.on(evt, fn); },
  off(evt, fn){ this._em.off(evt, fn); },

  getSummary(){
    const entries = Object.entries(this.wins).sort((a,b)=>(b[1]-a[1])||a[0].localeCompare(b[0]));
    return {
      handCount: this.handNumber,
      maxHands: this.maxHands,
      wins: { ...this.wins },
      top3: entries.slice(0,3),
      lastWinner: this._lastWinner || "—",
      lastHandName: this._lastHandName || "—",
      lastPot: this._lastPot || 0,
    };
  },

  build(scene, opts = {}) {
    this.scene = scene;
    if (opts.center) this.center.copy(opts.center);

    this.group = new THREE.Group();
    this.group.name = "PokerSimulation";
    this.scene.add(this.group);

    // If someone left an old "dealer" marker somewhere, hide it
    this.hideAnyDealerMarker(this.scene);

    // community cards hover group
    this.communityGroup = new THREE.Group();
    this.communityGroup.name = "CommunityHover";
    this.group.add(this.communityGroup);

    // Big info labels (higher + visible from distance)
    this.infoLabel = makeLabel("Pot: 0", { title: "ACTION", stroke1: "rgba(0,255,170,0.8)", stroke2: "rgba(255,60,120,0.8)" });
    this.infoLabel.position.set(this.center.x, 2.65, this.center.z + 0.9);
    this.infoLabel.rotation.y = Math.PI; // face toward spawn
    this.group.add(this.infoLabel);

    this.lastWinLabel = makeLabel("Waiting…", { title: "RESULT", stroke1: "rgba(255,60,120,0.75)", stroke2: "rgba(0,255,170,0.75)" });
    this.lastWinLabel.position.set(this.center.x, 3.35, this.center.z + 0.9);
    this.lastWinLabel.rotation.y = Math.PI;
    this.group.add(this.lastWinLabel);

    // Crown mesh (single, reused)
    this.crown = this.makeCrownMesh();
    this.crown.visible = false;
    this.group.add(this.crown);

    // bots (visual placeholders, sized better)
    this.spawnBots();

    // start loop
    this.resetTournament();
    this.beginNextHand();
  },

  update(dt, camera) {
    if (!this.group) return;

    this.stageT += dt;

    // Make labels face camera softly (but don’t tilt)
    if (camera) {
      this.faceCameraUpright(this.infoLabel, camera);
      this.faceCameraUpright(this.lastWinLabel, camera);
    }

    // crown shine + float
    this.updateCrown(dt);

    // stage machine
    if (this.stage === "deal") {
      if (this.stageT > 0.8) this.goto("preflop");
    }
    else if (this.stage === "preflop") {
      this.botActStep(dt, "Preflop");
    }
    else if (this.stage === "flop") {
      if (this.stageT > 0.8) this.goto("turn");
    }
    else if (this.stage === "turn") {
      if (this.stageT > 0.8) this.goto("river");
    }
    else if (this.stage === "river") {
      if (this.stageT > 0.8) this.goto("showdown");
    }
    else if (this.stage === "showdown") {
      if (this.stageT > 1.2) this.finishHand();
    }
    else if (this.stage === "victory") {
      // winner lap ~60s
      if (this.stageT > 60) {
        this.endVictoryAndContinue();
      } else {
        this.victoryLap(dt);
      }
    }
  },

  /* -----------------------------
     Bot + table placement
  ------------------------------ */
  spawnBots(){
    // Remove old
    for (const b of this.bots) this.group.remove(b.group);
    this.bots = [];

    // ring around table
    const radius = 2.65;
    for (let i=0;i<this.botCount;i++){
      const angle = (i / this.botCount) * Math.PI * 2;
      const bx = this.center.x + Math.cos(angle) * radius;
      const bz = this.center.z + Math.sin(angle) * radius;

      const bot = {
        id: i+1,
        name: `Boss ${i+1}`,
        stack: this.startStack,
        inHand: true,
        bet: 0,
        hole: [],
        best: null,
        wins: 0,
        group: new THREE.Group(),
        label: null,
        chipsPillar: null,
      };

      // body (bigger than before)
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.55, 10, 18),
        new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 })
      );
      body.position.y = 0.55;
      bot.group.add(body);

      // head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 18, 18),
        new THREE.MeshStandardMaterial({ color: 0x4a5162, roughness: 0.85 })
      );
      head.position.y = 1.12;
      bot.group.add(head);

      // name label (upright, doesn’t tilt with head)
      bot.label = makeLabel(`${bot.name} — $${bot.stack}`, { title: "STACK", stroke1: "rgba(0,255,170,0.7)", stroke2: "rgba(255,60,120,0.7)" });
      bot.label.scale.set(0.55,0.55,0.55);
      bot.label.position.set(0, 1.85, 0);
      bot.group.add(bot.label);

      // chip pillar (visual stack next to bot)
      bot.chipsPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16),
        new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.35, emissive: 0x00ffaa, emissiveIntensity: 0.35 })
      );
      bot.chipsPillar.position.set(0.35, 0.12, 0);
      bot.group.add(bot.chipsPillar);

      bot.group.position.set(bx, 0, bz);
      bot.group.lookAt(this.center.x, 1.0, this.center.z);
      bot.group.name = `Bot_${bot.id}`;

      this.group.add(bot.group);
      this.bots.push(bot);
      this.wins[bot.name] = 0;
    }
  },

  faceCameraUpright(obj, camera){
    if (!obj || !camera) return;
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    const objPos = new THREE.Vector3();
    obj.getWorldPosition(objPos);

    const dx = camPos.x - objPos.x;
    const dz = camPos.z - objPos.z;
    const yaw = Math.atan2(dx, dz); // yaw only, keep upright
    obj.rotation.set(0, yaw, 0);
  },

  hideAnyDealerMarker(root){
    if (!root || this._hiddenDealer) return;
    root.traverse((o) => {
      if (!o?.name) return;
      const n = o.name.toLowerCase();
      if (n.includes("dealer") || n.includes("dealerchip") || n.includes("dealer_chip") || n.includes("green_circle")) {
        o.visible = false;
      }
    });
    this._hiddenDealer = true;
  },

  makeCrownMesh(){
    // simple crown: ring + spikes
    const g = new THREE.Group();
    g.name = "WinnerCrown";

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.06, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        roughness: 0.25,
        metalness: 0.7,
        emissive: 0xffd166,
        emissiveIntensity: 0.7,
      })
    );
    ring.rotation.x = Math.PI/2;
    g.add(ring);

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0xffd166,
      emissiveIntensity: 0.9,
    });

    for (let i=0;i<6;i++){
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 10), spikeMat);
      const a = (i/6)*Math.PI*2;
      spike.position.set(Math.cos(a)*0.17, 0.12, Math.sin(a)*0.17);
      spike.rotation.x = 0;
      g.add(spike);
    }

    const glow = new THREE.PointLight(0xffd166, 0.9, 3);
    glow.position.set(0, 0.25, 0);
    g.add(glow);

    return g;
  },

  updateCrown(dt){
    if (!this.crown) return;

    if (!this.crown.visible) return;

    this.crownT += dt;
    // float + shine
    const floatY = 2.05 + Math.sin(this.crownT * 3.0) * 0.06;
    this.crown.position.y = floatY;

    // slowly rotate
    this.crown.rotation.y += dt * 0.8;

    // emissive pulse
    this.crown.traverse((o) => {
      if (o?.material?.emissiveIntensity != null) {
        o.material.emissiveIntensity = 0.75 + Math.sin(this.crownT * 4.0) * 0.25;
      }
    });
  },

  /* -----------------------------
     Tournament / Hand Flow
  ------------------------------ */
  resetTournament(){
    this.handNumber = 0;
    this.wins = {};
    for (const b of this.bots) {
      this.wins[b.name] = 0;
      b.stack = this.startStack;
    }
    this._lastWinner = "—";
    this._lastHandName = "—";
    this._lastPot = 0;
  },

  goto(stage){
    this.stage = stage;
    this.stageT = 0;
    this.actingIndex = 0;
  },

  beginNextHand(){
    // Crown disappears at the start of a new hand (rule fix)
    this.clearCrown();

    this.handNumber += 1;
    if (this.handNumber > this.maxHands) {
      // restart tournament loop
      this.resetTournament();
      this.handNumber = 1;
    }

    // reset hand
    this.deck = shuffle(makeDeck());
    this.community = [];
    this.pot = 0;

    for (const b of this.bots) {
      b.inHand = b.stack > 0;
      b.bet = 0;
      b.hole = [];
      b.best = null;
    }

    // deal 2 to each in-hand bot
    for (let r=0;r<2;r++){
      for (const b of this.bots){
        if (!b.inHand) continue;
        b.hole.push(this.deck.pop());
      }
    }

    // community placeholders (hover)
    this.renderCommunity();

    // update labels
    this.infoLabel.userData.setText(`Hand ${this.handNumber}/${this.maxHands} — Dealing…`, "ACTION");
    this.lastWinLabel.userData.setText(`Waiting for showdown`, "RESULT");

    this.goto("deal");
  },

  botActStep(dt, streetName){
    // simple staged betting: each bot randomly fold/call/raise based on crude strength
    // We do one action every ~0.6s
    if (this.stageT < 0.6) return;
    this.stageT = 0;

    // If all but one folded, win immediately
    const active = this.bots.filter(b => b.inHand);
    if (active.length <= 1) {
      const winner = active[0] || this.bots.find(b=>b.stack>0) || this.bots[0];
      this.declareWinner(winner, "All Others Folded");
      this.goto("showdown");
      return;
    }

    // next acting bot
    let bot = null;
    for (let tries=0; tries<this.bots.length; tries++){
      const idx = (this.actingIndex + tries) % this.bots.length;
      if (this.bots[idx].inHand) { bot = this.bots[idx]; this.actingIndex = idx+1; break; }
    }
    if (!bot) return;

    // crude strength estimate (preflop uses hole cards; later includes community)
    const cards = bot.hole.concat(this.community);
    const est = this.estimateStrength(cards);

    // decision
    const roll = Math.random();
    let action = "CALL";
    let amount = 0;

    // fold chance decreases with strength
    const foldChance = this.clamp(0.35 - est * 0.25, 0.05, 0.35);
    const raiseChance = this.clamp(0.18 + est * 0.35, 0.12, 0.60);

    if (roll < foldChance) {
      bot.inHand = false;
      action = "FOLD";
      amount = 0;
    } else if (roll < foldChance + raiseChance) {
      action = "RAISE";
      amount = this.pickBet(bot, est, true);
      this.commitBet(bot, amount);
    } else {
      action = "CALL";
      amount = this.pickBet(bot, est, false);
      this.commitBet(bot, amount);
    }

    // update action label high + big
    this.infoLabel.userData.setText(`${bot.name} ${action}${amount ? ` $${amount}` : ""} • Pot $${this.pot}`, "ACTION");

    // after everyone acts once per street, move street
    if (this.actingIndex >= this.bots.length) {
      if (this.community.length === 0) {
        // flop
        this.community.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        this.renderCommunity();
        this.goto("flop");
        this.infoLabel.userData.setText(`FLOP • Pot $${this.pot}`, "ACTION");
      } else if (this.community.length === 3) {
        // turn
        this.community.push(this.deck.pop());
        this.renderCommunity();
        this.goto("turn");
        this.infoLabel.userData.setText(`TURN • Pot $${this.pot}`, "ACTION");
      } else if (this.community.length === 4) {
        // river
        this.community.push(this.deck.pop());
        this.renderCommunity();
        this.goto("river");
        this.infoLabel.userData.setText(`RIVER • Pot $${this.pot}`, "ACTION");
      } else {
        // showdown
        this.goto("showdown");
      }
    }
  },

  estimateStrength(cards){
    // Very rough: pairs/high cards help; later streets bestOf7 helps
    const rs = cards.map(c=>c.r).sort((a,b)=>b-a);
    let score = 0.15;
    if (rs[0] >= 13) score += 0.10;
    if (rs[0] >= 14) score += 0.10;

    // pairs
    const m = new Map();
    for (const r of rs) m.set(r,(m.get(r)||0)+1);
    for (const c of m.values()){
      if (c===2) score += 0.15;
      if (c===3) score += 0.22;
      if (c===4) score += 0.30;
    }

    // if 5+ community total, use evaluator
    if (cards.length >= 5) {
      const best = bestOf7(cards.length===7 ? cards : cards.concat([]));
      score += best.cat * 0.06; // higher categories stronger
    }
    return this.clamp(score, 0.05, 0.95);
  },

  pickBet(bot, est, raising){
    if (bot.stack <= 0) return 0;
    // simple bet sizing
    const base = raising ? 450 : 250;
    const mult = 1 + est * (raising ? 2.2 : 1.4);
    const amt = Math.min(bot.stack, Math.round(base * mult));
    // keep it visible but not insane
    return Math.max(0, Math.min(amt, 2500));
  },

  commitBet(bot, amt){
    if (amt <= 0) return;
    const a = Math.min(bot.stack, amt);
    bot.stack -= a;
    bot.bet += a;
    this.pot += a;
    bot.label.userData.setText(`${bot.name} — $${bot.stack}`, "STACK");
  },

  renderCommunity(){
    if (!this.communityGroup) return;
    // clear
    while (this.communityGroup.children.length) this.communityGroup.remove(this.communityGroup.children[0]);

    // Hover in center, bigger, facing player/spawn direction
    const y = 2.05;
    const z = this.center.z + 0.05;
    const x0 = this.center.x;

    const gap = 0.48;
    const start = x0 - (gap * 2);

    for (let i=0;i<5;i++){
      const c = this.community[i];
      const mesh = c ? makeCardMesh(c, true) : makeCardMesh({rs:"",pip:"",color:"#ffffff"}, false);

      mesh.position.set(start + i*gap, y, z);
      mesh.rotation.y = Math.PI; // face spawn
      mesh.name = `Community_${i}`;
      this.communityGroup.add(mesh);
    }
  },

  finishHand(){
    // Evaluate remaining bots
    const alive = this.bots.filter(b=>b.inHand);
    if (alive.length === 0) {
      // weird edge; restart
      this.beginNextHand();
      return;
    }
    if (alive.length === 1) {
      this.declareWinner(alive[0], "All Others Folded");
      this.goto("victory");
      return;
    }

    // compute best
    let bestBot = null;
    for (const b of alive){
      const cards7 = b.hole.concat(this.community);
      // if missing community (shouldn't happen), pad draw
      while (cards7.length < 7) cards7.push(this.deck.pop());
      b.best = bestOf7(cards7.slice(0,7));
      if (!bestBot || compareEval(b.best, bestBot.best) > 0) bestBot = b;
    }

    this.declareWinner(bestBot, bestBot.best?.name || "Winner");
    this.goto("victory");
  },

  declareWinner(bot, handName){
    if (!bot) return;

    // award pot
    bot.stack += this.pot;
    bot.label.userData.setText(`${bot.name} — $${bot.stack}`, "STACK");

    // store stats
    this._lastWinner = bot.name;
    this._lastHandName = handName;
    this._lastPot = this.pot;

    this.wins[bot.name] = (this.wins[bot.name] || 0) + 1;

    // Result label big + higher
    this.lastWinLabel.userData.setText(`${bot.name} wins • ${handName} • +$${this.pot}`, "RESULT");

    // set crown (ONLY winner)
    this.setCrownOn(bot);

    // emit to world leaderboard
    this._em.emit("hand_end", {
      handNumber: this.handNumber,
      maxHands: this.maxHands,
      winnerName: bot.name,
      handName,
      pot: this.pot,
      wins: { ...this.wins },
    });

    // pot reset for visuals after announcing
    this.pot = 0;
  },

  setCrownOn(bot){
    this.clearCrown();

    this.crownOwner = bot;
    this.crown.visible = true;
    this.crownT = 0;

    // position above head, higher than before
    const p = new THREE.Vector3();
    bot.group.getWorldPosition(p);
    this.crown.position.set(p.x, 2.25, p.z); // higher crown
  },

  clearCrown(){
    this.crown.visible = false;
    this.crownOwner = null;
    this.crownT = 0;
  },

  victoryLap(dt){
    // Winner walks a small circle for 60s
    if (!this.crownOwner) return;

    const b = this.crownOwner;
    const t = this.stageT;

    // walk radius outside player ring
    const r = 3.6;
    const a = (t * 0.35) % (Math.PI * 2);
    const x = this.center.x + Math.cos(a) * r;
    const z = this.center.z + Math.sin(a) * r;

    b.group.position.x = x;
    b.group.position.z = z;
    b.group.lookAt(this.center.x, 1.1, this.center.z);

    // crown follows winner, floats higher and shines (updateCrown handles y/pulse)
    const p = new THREE.Vector3();
    b.group.getWorldPosition(p);
    this.crown.position.x = p.x;
    this.crown.position.z = p.z;
  },

  endVictoryAndContinue(){
    // return everyone to seats ring
    this.spawnBots();

    // crown stays visible briefly at end? (your request: 1 minute already done)
    // Now remove crown when new hand starts
    this.beginNextHand();
  },
};
