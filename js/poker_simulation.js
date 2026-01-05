// js/poker_simulation.js — Boss-only poker simulation + Dealer/Blinds + dealing animation
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { makeDeck, shuffle, makeCardMesh } from "./cards.js";
import { Pot } from "./pot.js";
import { DealerBlinds } from "./dealer_blinds.js";

export const PokerSimulation = {
  scene: null,
  camera: null,
  bossBots: null,
  leaderboard: null,
  announce: null,

  bossCenter: new THREE.Vector3(0, 0, -6.5),
  seatRadius: 3.55,
  tableY: 1.05,

  players: [],
  deck: [],
  community: [],
  hole: new Map(),

  phase: "IDLE",
  t: 0,
  handCount: 0,

  aggressiveMode: false,
  aggroTimer: 0,

  // visuals
  cardGroup: null,
  potPos: null,

  // dealing animation queue
  dealQueue: [], // { mesh, from, to, rotY, t, dur }

  init(scene, camera, BossBots, Leaderboard, announceFn) {
    this.scene = scene;
    this.camera = camera;
    this.bossBots = BossBots;
    this.leaderboard = Leaderboard;
    this.announce = announceFn || (() => {});

    this.cardGroup = new THREE.Group();
    this.cardGroup.name = "PokerCards";
    scene.add(this.cardGroup);

    this.potPos = new THREE.Vector3(this.bossCenter.x, this.tableY, this.bossCenter.z);
    Pot.build(scene, this.potPos);

    this._syncPlayersFromBots();

    // Dealer / blinds markers
    DealerBlinds.build(scene, new THREE.Vector3(this.bossCenter.x, this.tableY, this.bossCenter.z), this.seatRadius, this.players.length);

    this._startNewHand(true);
  },

  _syncPlayersFromBots() {
    const bots = this.bossBots?.bots || [];
    this.players = bots.slice(0, 5).map((b, i) => ({
      name: `BOSS ${i + 1}`,
      group: b.group,
      stack: 100000,
      crown: false,
      crownObj: null,
      points: 0
    }));

    if (this.players[0]) {
      this.players[0].crown = true;
      this._setCrown(this.players[0], true);
    }
  },

  update(dt) {
    if (!this.scene || !this.camera || this.players.length < 2) return;

    // Aggro timer
    if (this.aggressiveMode) {
      this.aggroTimer -= dt;
      if (this.aggroTimer <= 0) {
        this.aggressiveMode = false;
        this.announce("Bosses calm down… back to normal play.");
      }
    }

    // Animate deal queue
    this._updateDealing(dt);

    this.t += dt;

    // phase timings (slightly longer so you can SEE dealing)
    if (this.phase === "DEAL" && this.t > 3.3) return this._go("FLOP");
    if (this.phase === "FLOP" && this.t > 2.9) return this._go("TURN");
    if (this.phase === "TURN" && this.t > 2.4) return this._go("RIVER");
    if (this.phase === "RIVER" && this.t > 2.4) return this._go("SHOWDOWN");
    if (this.phase === "SHOWDOWN" && this.t > 3.0) return this._go("BREAK");
    if (this.phase === "BREAK" && this.t > 2.0) return this._startNewHand(false);

    // Leaderboard feed
    if (this.leaderboard?.update) {
      const data = {
        title: this.aggressiveMode ? "BOSS TABLE (AGGRESSIVE)" : "BOSS TABLE (SHOW)",
        rows: this.players
          .slice()
          .sort((a, b) => b.points - a.points)
          .map(p => ({ name: p.name + (p.crown ? " 👑" : ""), points: p.points })),
        footer: `Hands: ${this.handCount} • Pot: ${Pot.potValue.toLocaleString()} • Dealer: ${this.players[DealerBlinds.dealerIndex]?.name || ""}`
      };
      this.leaderboard.update(0, this.camera, data);
    }
  },

  _updateDealing(dt) {
    for (let i = this.dealQueue.length - 1; i >= 0; i--) {
      const d = this.dealQueue[i];
      d.t += dt;
      const a = Math.min(1, d.t / d.dur);

      // smooth step
      const s = a * a * (3 - 2 * a);

      d.mesh.position.lerpVectors(d.from, d.to, s);
      d.mesh.rotation.y = d.rotY;

      // tiny float
      d.mesh.position.y += Math.sin(a * Math.PI) * 0.06;

      if (a >= 1) this.dealQueue.splice(i, 1);
    }
  },

  _go(nextPhase) {
    this.phase = nextPhase;
    this.t = 0;

    if (nextPhase === "FLOP") this._dealCommunity(3);
    if (nextPhase === "TURN") this._dealCommunity(1);
    if (nextPhase === "RIVER") this._dealCommunity(1);
    if (nextPhase === "SHOWDOWN") this._resolveWinner();
  },

  _startNewHand(first) {
    this.handCount++;
    this.phase = "DEAL";
    this.t = 0;

    // rotate dealer + blinds
    if (!first) DealerBlinds.nextHand(this.players.length);

    // every 5 hands: aggressive “return”
    if (!first && this.handCount % 5 === 0) {
      this.aggressiveMode = true;
      this.aggroTimer = 18 + Math.random() * 10;
      this.announce("Bosses left the table… then came back AGGRESSIVE.");
    }

    // clean visuals
    this._clearCards();
    this.dealQueue = [];
    Pot.reset();

    // deck reset
    this.deck = shuffle(makeDeck());
    this.community = [];
    this.hole.clear();

    // blinds/ante
    const base = this.aggressiveMode ? 800 : 400;
    const sb = this.aggressiveMode ? 1500 : 800;
    const bb = this.aggressiveMode ? 3000 : 1600;

    // Everyone antes
    for (const p of this.players) {
      const ante = base + ((Math.random() * base) | 0);
      p.stack = Math.max(0, p.stack - ante);
      Pot.add(ante);
    }

    // Post blinds by indices
    const pSB = this.players[DealerBlinds.sbIndex];
    const pBB = this.players[DealerBlinds.bbIndex];
    if (pSB) { pSB.stack = Math.max(0, pSB.stack - sb); Pot.add(sb); }
    if (pBB) { pBB.stack = Math.max(0, pBB.stack - bb); Pot.add(bb); }

    this.announce(this.aggressiveMode ? "New Hand: Aggressive betting!" : "New Hand started.");

    // Deal 2 cards each (animated)
    for (const p of this.players) {
      const c1 = this.deck.pop();
      const c2 = this.deck.pop();
      this.hole.set(p.name, [c1, c2]);
      this._dealHoleAnimated(p, c1, c2);
    }

    // Preflop “bets” so pot grows
    for (const p of this.players) {
      const bet = (this.aggressiveMode ? 2500 : 1200) + ((Math.random() * (this.aggressiveMode ? 2200 : 900)) | 0);
      p.stack = Math.max(0, p.stack - bet);
      Pot.add(bet);
    }
  },

  _dealHoleAnimated(player, c1, c2) {
    if (!player?.group) return;

    const seatWorld = new THREE.Vector3();
    player.group.getWorldPosition(seatWorld);

    const dirToCenter = new THREE.Vector3(this.bossCenter.x - seatWorld.x, 0, this.bossCenter.z - seatWorld.z).normalize();
    const yaw = Math.atan2(dirToCenter.x, dirToCenter.z);

    const baseTo = new THREE.Vector3(seatWorld.x, this.tableY + 0.02, seatWorld.z).addScaledVector(dirToCenter, 0.55);

    const to1 = baseTo.clone().add(new THREE.Vector3(-0.17, 0, 0));
    const to2 = baseTo.clone().add(new THREE.Vector3( 0.17, 0, 0));

    const from = new THREE.Vector3(this.bossCenter.x, this.tableY + 0.06, this.bossCenter.z);

    const card1 = makeCardMesh(c1);
    const card2 = makeCardMesh(c2);
    card1.userData.kind = "hole";
    card2.userData.kind = "hole";

    card1.position.copy(from);
    card2.position.copy(from);

    this.cardGroup.add(card1, card2);

    this.dealQueue.push({ mesh: card1, from: from.clone(), to: to1, rotY: yaw, t: 0, dur: 0.55 });
    this.dealQueue.push({ mesh: card2, from: from.clone(), to: to2, rotY: yaw, t: 0, dur: 0.65 });
  },

  _dealCommunity(n) {
    // burn card feel (visual only)
    const bump = this.aggressiveMode ? 9000 : 4500;
    Pot.add(bump);

    for (let i = 0; i < n; i++) {
      const c = this.deck.pop();
      this.community.push(c);
      this._dealCommunityAnimated(c, this.community.length - 1);
    }
  },

  _dealCommunityAnimated(card, idx) {
    const mesh = makeCardMesh(card);
    mesh.userData.kind = "community";

    const startX = -0.72;
    const x = startX + idx * 0.36;

    const from = new THREE.Vector3(this.bossCenter.x, this.tableY + 0.07, this.bossCenter.z);
    const to = new THREE.Vector3(this.bossCenter.x + x, this.tableY + 0.03, this.bossCenter.z);

    mesh.position.copy(from);
    mesh.rotation.y = Math.PI;

    this.cardGroup.add(mesh);

    this.dealQueue.push({ mesh, from: from.clone(), to, rotY: Math.PI, t: 0, dur: 0.7 });
  },

  _resolveWinner() {
    // Weighted random winner
    const weights = this.players.map(p => {
      const base = 1.0;
      const stackFactor = 0.8 + Math.min(0.6, p.stack / 200000);
      const crownBias = p.crown ? 1.05 : 1.0;
      const aggro = this.aggressiveMode ? (0.9 + Math.random() * 1.3) : (0.9 + Math.random() * 0.7);
      return base * stackFactor * crownBias * aggro;
    });

    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let winner = this.players[0];
    for (let i = 0; i < this.players.length; i++) {
      r -= weights[i];
      if (r <= 0) { winner = this.players[i]; break; }
    }

    winner.points += this.aggressiveMode ? 18 : 10;
    winner.stack += Pot.potValue;

    const currentCrown = this.players.find(p => p.crown);
    if (currentCrown && currentCrown !== winner) {
      currentCrown.crown = false;
      this._setCrown(currentCrown, false);

      winner.crown = true;
      this._setCrown(winner, true);

      this.announce(`CROWN TAKEN: ${winner.name} took ${currentCrown.name}'s crown!`);
    } else {
      this.announce(`${winner.name} wins the hand.`);
    }
  },

  _setCrown(player, on) {
    if (!player?.group) return;

    if (!on) {
      if (player.crownObj?.parent) player.crownObj.parent.remove(player.crownObj);
      player.crownObj = null;
      return;
    }

    const crown = new THREE.Group();
    crown.name = "CrownMarker";

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.03, 10, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffd04a,
        roughness: 0.35,
        metalness: 0.35,
        emissive: 0x332200,
        emissiveIntensity: 0.25
      })
    );
    ring.rotation.x = Math.PI / 2;

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xffd04a,
      roughness: 0.35,
      metalness: 0.35,
      emissive: 0x221400,
      emissiveIntensity: 0.18
    });

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.10, 10), spikeMat);
      spike.position.set(Math.sin(a) * 0.13, 0.06, Math.cos(a) * 0.13);
      spike.rotation.y = a;
      crown.add(spike);
    }

    crown.add(ring);
    crown.position.set(0, 1.38, 0);
    player.group.add(crown);
    player.crownObj = crown;
  },

  _clearCards() {
    if (!this.cardGroup) return;
    while (this.cardGroup.children.length) this.cardGroup.remove(this.cardGroup.children[0]);
  }
};
