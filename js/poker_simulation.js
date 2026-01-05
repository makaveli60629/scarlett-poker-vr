// js/poker_simulation.js — Boss-only poker simulation (GitHub-safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { makeDeck, shuffle, makeCardMesh } from "./cards.js";
import { Pot } from "./pot.js";

export const PokerSimulation = {
  scene: null,
  camera: null,
  bossBots: null,     // reference to BossBots module (expects BossBots.bots array)
  leaderboard: null,  // reference to your Leaderboard module
  announce: null,     // function(msg)

  // Layout
  bossCenter: new THREE.Vector3(0, 0, -6.5),
  seatRadius: 3.55,
  tableY: 1.05,

  // Game state
  players: [], // { name, group, stack, crown, crownObj }
  deck: [],
  community: [],
  hole: new Map(), // name -> [c1,c2]
  phase: "IDLE",   // IDLE, DEAL, FLOP, TURN, RIVER, SHOWDOWN, BREAK
  t: 0,

  // Visuals
  cardGroup: null,
  potPos: null,

  // Behavior
  handCount: 0,
  aggressiveMode: false,
  aggroTimer: 0,

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

    // Set first crown holder initially
    if (this.players[0]) {
      this.players[0].crown = true;
      this._setCrown(this.players[0], true);
    }
  },

  update(dt) {
    if (!this.scene || !this.camera || this.players.length < 2) return;

    // Aggro mode timer
    if (this.aggressiveMode) {
      this.aggroTimer -= dt;
      if (this.aggroTimer <= 0) {
        this.aggressiveMode = false;
        this.announce("Bosses calm down… returning to normal play.");
      }
    }

    this.t += dt;

    // Step phases on timers (keeps it cinematic)
    if (this.phase === "DEAL" && this.t > 2.2) return this._go("FLOP");
    if (this.phase === "FLOP" && this.t > 2.4) return this._go("TURN");
    if (this.phase === "TURN" && this.t > 2.2) return this._go("RIVER");
    if (this.phase === "RIVER" && this.t > 2.2) return this._go("SHOWDOWN");
    if (this.phase === "SHOWDOWN" && this.t > 2.8) return this._go("BREAK");
    if (this.phase === "BREAK" && this.t > 1.8) return this._startNewHand(false);

    // Feed leaderboard periodically
    if (this.leaderboard?.update) {
      const data = {
        title: this.aggressiveMode ? "BOSS TABLE (AGGRESSIVE)" : "BOSS TABLE (SHOW)",
        rows: this.players
          .slice()
          .sort((a, b) => b.points - a.points)
          .map(p => ({ name: p.name + (p.crown ? " 👑" : ""), points: p.points })),
        footer: `Hands: ${this.handCount} • Pot: ${Pot.potValue.toLocaleString()}`
      };
      this.leaderboard.update(0, this.camera, data);
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

    // Rare “leave to random room + aggressive” moment
    // (visual message now; later you can actually move them to room pads)
    if (!first && this.handCount % 5 === 0) {
      this.aggressiveMode = true;
      this.aggroTimer = 18 + Math.random() * 10;
      this.announce("Bosses left the table… then came back AGGRESSIVE.");
    }

    // Clean visuals
    this._clearCards();
    Pot.reset();

    // New deck
    this.deck = shuffle(makeDeck());
    this.community = [];
    this.hole.clear();

    // Blinds + ante
    const base = this.aggressiveMode ? 800 : 400;
    for (const p of this.players) {
      const ante = base + ((Math.random() * base) | 0);
      p.stack = Math.max(0, p.stack - ante);
      Pot.add(ante);
    }

    // Deal 2 cards each + place “face-down” at seat
    for (const p of this.players) {
      const c1 = this.deck.pop();
      const c2 = this.deck.pop();
      this.hole.set(p.name, [c1, c2]);

      this._spawnHoleCards(p, c1, c2);
      // “bet” immediately a little
      const bet = (this.aggressiveMode ? 2500 : 1200) + ((Math.random() * (this.aggressiveMode ? 2200 : 900)) | 0);
      p.stack = Math.max(0, p.stack - bet);
      Pot.add(bet);
    }

    this.announce(this.aggressiveMode ? "New Hand: Aggressive betting!" : "New Hand started.");
  },

  _dealCommunity(n) {
    for (let i = 0; i < n; i++) {
      const c = this.deck.pop();
      this.community.push(c);
      this._spawnCommunityCard(c, this.community.length - 1);
    }

    // Add pot bump each street
    const bump = this.aggressiveMode ? 9000 : 4500;
    Pot.add(bump);
  },

  _resolveWinner() {
    // Simple winner logic: weighted random by aggression + small stack factor
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

    // Award points + pot
    winner.points += this.aggressiveMode ? 18 : 10;
    winner.stack += Pot.potValue;

    // Crown transfer
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

    // simple crown marker
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
    crown.position.set(0, 1.38, 0); // above head
    player.group.add(crown);
    player.crownObj = crown;
  },

  _spawnHoleCards(player, c1, c2) {
    if (!player?.group) return;

    // place cards near seat facing table center
    const p = new THREE.Vector3();
    player.group.getWorldPosition(p);

    const dirToCenter = new THREE.Vector3(this.bossCenter.x - p.x, 0, this.bossCenter.z - p.z).normalize();
    const yaw = Math.atan2(dirToCenter.x, dirToCenter.z);

    const card1 = makeCardMesh(c1);
    const card2 = makeCardMesh(c2);

    const base = new THREE.Vector3(p.x, this.tableY + 0.02, p.z).addScaledVector(dirToCenter, 0.55);
    card1.position.copy(base).add(new THREE.Vector3(-0.17, 0, 0));
    card2.position.copy(base).add(new THREE.Vector3( 0.17, 0, 0));

    card1.rotation.y = yaw;
    card2.rotation.y = yaw;

    card1.userData.kind = "hole";
    card2.userData.kind = "hole";

    this.cardGroup.add(card1, card2);
  },

  _spawnCommunityCard(card, idx) {
    const mesh = makeCardMesh(card);
    mesh.userData.kind = "community";

    // spread 5 cards in a row
    const startX = -0.72;
    const x = startX + idx * 0.36;

    mesh.position.set(this.bossCenter.x + x, this.tableY + 0.03, this.bossCenter.z);
    mesh.rotation.y = Math.PI; // faces toward +Z by default
    this.cardGroup.add(mesh);
  },

  _clearCards() {
    if (!this.cardGroup) return;
    while (this.cardGroup.children.length) this.cardGroup.remove(this.cardGroup.children[0]);
  }
};
