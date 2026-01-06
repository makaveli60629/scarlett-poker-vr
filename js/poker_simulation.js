// /js/poker_simulation.js — Watchable Poker Sim (9.0)
// - 8 bots by default
// - Player joins a seat by Interactions.setPlayerSeat(seatIndex)
// - If player not seated => no player cards
// - Slow step timing so you can SEE dealing + actions

import * as THREE from "./three.js";

export class PokerSimulation {
  constructor({ camera, tableCenter, tableAnchors, seats, onLeaderboard }) {
    this.camera = camera;
    this.tableCenter = tableCenter;
    this.anchors = tableAnchors;
    this.seats = seats;
    this.onLeaderboard = onLeaderboard;

    this.players = [];
    this.playerSeat = -1;

    this.t = 0;
    this.stepTimer = 0;
    this.step = 0;

    this.pot = 0;
    this.phase = "idle";

    this.community = [];
    this.turnIndex = 0;

    this.visual = {
      labels: [],
      cards: [],
      commCards: [],
      potLabel: null,
      banner: null
    };
  }

  build(scene) {
    this.scene = scene;

    // Create bots positioned at seats
    this.players = [];
    for (let i = 0; i < this.seats.length; i++) {
      const p = makeBot(i);
      p.seatIndex = i;
      p.chips = 1000;
      p.inHand = true;
      p.isPlayer = false;
      this.players.push(p);

      // Bot mesh (pill w/ color)
      const mesh = botMesh(i);
      this.scene.add(mesh);
      p.mesh = mesh;

      // Put bot on chair seat target
      const pos = new THREE.Vector3();
      this.seats[i].sitTarget.getWorldPosition(pos);
      mesh.position.set(pos.x, 0, pos.z);
      mesh.position.y = 0.0; // stands on floor
      mesh.lookAt(this.tableCenter.x, 0.0, this.tableCenter.z);

      // Label above head
      const label = makeTag(`Bot ${i + 1}\n$${p.chips}`, 0.55);
      label.position.set(0, 1.55, 0);
      mesh.add(label);
      p.label = label;
    }

    // Pot label (above community)
    this.visual.potLabel = makeBillboardText("POT: $0", 0.55, 0.2);
    this.visual.potLabel.position.copy(this.anchors.pot.position);
    this.scene.add(this.visual.potLabel);

    // Banner (phase / whose turn)
    this.visual.banner = makeBillboardText("WAITING FOR PLAYER…", 0.9, 0.25);
    this.visual.banner.position.copy(this.anchors.banner.position);
    this.scene.add(this.visual.banner);

    // Start loop but stay idle until player sits
    this.resetHand();
  }

  setPlayerSeat(seatIndex) {
    this.playerSeat = seatIndex;

    // If player joins, mark that seat as player and remove bot visually from that seat.
    // We’ll “park” the replaced bot in lobby later; for now just hide it.
    for (const p of this.players) p.isPlayer = false;

    if (seatIndex >= 0) {
      const botAtSeat = this.players.find(p => p.seatIndex === seatIndex);
      if (botAtSeat) {
        botAtSeat.hiddenForPlayer = true;
        botAtSeat.mesh.visible = false; // player takes that seat
      }
      // The player is not a mesh (you are the camera) — so we just flag seat
      this.visual.banner.userData.setText("READY — STARTING HAND…");
      this.resetHand(true);
    } else {
      // player left
      for (const p of this.players) {
        p.hiddenForPlayer = false;
        p.mesh.visible = true;
      }
      this.visual.banner.userData.setText("WAITING FOR PLAYER…");
      this.resetHand(false);
    }
  }

  resetHand(startIfPlayer = false) {
    this.phase = startIfPlayer ? "predeal" : "idle";
    this.step = 0;
    this.stepTimer = 0;

    this.pot = 0;
    this.community = [];
    this.turnIndex = 0;

    for (const p of this.players) {
      p.inHand = true;
      p.bet = 0;
      p.hand = [];
    }

    this._clearVisualCards();
    this._updateTags();
    this._updatePot();
  }

  update(dt) {
    this.t += dt;

    // billboard labels face camera
    this.visual.potLabel?.lookAt(this.camera.position);
    this.visual.banner?.lookAt(this.camera.position);

    // idle until player is seated
    if (this.phase === "idle") return;

    this.stepTimer += dt;

    // SLOW timing so you can watch it
    const WAIT = 0.85;
    if (this.stepTimer < WAIT) return;
    this.stepTimer = 0;

    // State machine
    if (this.phase === "predeal") {
      this.visual.banner.userData.setText("DEALING HOLE CARDS…");
      this._dealHoleCards();
      this.phase = "bet1";
      return;
    }

    if (this.phase === "bet1") {
      this.visual.banner.userData.setText("BETTING ROUND 1…");
      this._betRound();
      this.phase = "flop";
      return;
    }

    if (this.phase === "flop") {
      this.visual.banner.userData.setText("FLOP");
      this._dealCommunity(3);
      this.phase = "bet2";
      return;
    }

    if (this.phase === "bet2") {
      this.visual.banner.userData.setText("BETTING ROUND 2…");
      this._betRound();
      this.phase = "turn";
      return;
    }

    if (this.phase === "turn") {
      this.visual.banner.userData.setText("TURN");
      this._dealCommunity(1);
      this.phase = "bet3";
      return;
    }

    if (this.phase === "bet3") {
      this.visual.banner.userData.setText("BETTING ROUND 3…");
      this._betRound();
      this.phase = "river";
      return;
    }

    if (this.phase === "river") {
      this.visual.banner.userData.setText("RIVER");
      this._dealCommunity(1);
      this.phase = "bet4";
      return;
    }

    if (this.phase === "bet4") {
      this.visual.banner.userData.setText("FINAL BETTING…");
      this._betRound();
      this.phase = "showdown";
      return;
    }

    if (this.phase === "showdown") {
      this._showdown();
      this.phase = "winner_walk";
      this.winnerWalkTimer = 0;
      return;
    }

    if (this.phase === "winner_walk") {
      this.winnerWalkTimer += WAIT;
      if (this.winnerWalkTimer >= 60) {
        // After 1 minute, start next hand
        this.resetHand(true);
      }
      return;
    }
  }

  // -----------------------------
  // Core actions
  // -----------------------------
  _dealHoleCards() {
    // Deal to bots at table, and to player seat IF seated
    const seated = this.playerSeat >= 0;

    for (let round = 0; round < 2; round++) {
      for (const p of this.players) {
        if (p.hiddenForPlayer) continue; // replaced by player
        if (!p.inHand) continue;
        p.hand.push(drawCard());
        this._spawnCardAbove(p);
      }

      if (seated) {
        // player "hand" exists only as data; visuals can be optional later
        // we store it but do NOT place random cards in front of you anymore unless seated
        const playerP = this._getPlayerProxy();
        playerP.hand.push(drawCard());
      }
    }
  }

  _betRound() {
    // simple slow visible betting
    for (const p of this.players) {
      if (p.hiddenForPlayer) continue;
      if (!p.inHand) continue;

      const action = Math.random();
      if (action < 0.18) {
        p.inHand = false;
        this._setTag(p, `${nameOf(p)}\nFOLDED\n$${p.chips}`);
      } else {
        const bet = Math.min(p.chips, 25 + Math.floor(Math.random() * 75));
        p.chips -= bet;
        p.bet += bet;
        this.pot += bet;
        this._setTag(p, `${nameOf(p)}\nBET $${bet}\n$${p.chips}`);
        this._spawnChipStack(p, bet);
      }
    }

    // player proxy betting later (when you’re ready to play)
    this._updatePot();
    this._updateLeaderboard();
  }

  _dealCommunity(n) {
    for (let i = 0; i < n; i++) this.community.push(drawCard());
    this._renderCommunityCards();
  }

  _showdown() {
    // pick random winner among those still in hand (including player seat logically)
    const alive = this.players.filter(p => !p.hiddenForPlayer && p.inHand);
    if (!alive.length) {
      this.resetHand(true);
      return;
    }

    const winner = alive[Math.floor(Math.random() * alive.length)];
    winner.chips += this.pot;

    this.visual.banner.userData.setText(`WINNER: ${nameOf(winner)}  (+$${this.pot})`);
    this.pot = 0;
    this._updatePot();

    // crown texture later — for now we just glow the winner
    winner.mesh.traverse(o => {
      if (o.material && o.material.emissive) {
        o.material.emissive.set(0xffd27a);
        o.material.emissiveIntensity = 0.7;
      }
    });

    // "winner walk" begins
    this._updateLeaderboard();
  }

  // -----------------------------
  // Visual helpers
  // -----------------------------
  _spawnCardAbove(p) {
    // small card billboard above head, slightly to side (won’t block tags)
    const card = makeCardBillboard();
    card.position.set(0.35, 1.25, 0.1);
    p.mesh.add(card);
    this.visual.cards.push(card);
  }

  _spawnChipStack(p, bet) {
    const chip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 })
    );
    chip.position.set(0.25, 0.78, 0.2);
    chip.rotation.x = Math.PI / 2;
    this.scene.add(chip);

    // place near player position around table center
    const wp = new THREE.Vector3();
    p.mesh.getWorldPosition(wp);
    const dir = wp.clone().sub(this.tableCenter).normalize();
    const place = this.tableCenter.clone().add(dir.multiplyScalar(1.25));
    chip.position.set(place.x, 0.78, place.z);

    this.visual.cards.push(chip);
  }

  _renderCommunityCards() {
    // clear old
    for (const c of this.visual.commCards) this.scene.remove(c);
    this.visual.commCards = [];

    // layout facing the player/camera
    const base = this.anchors.community.getWorldPosition(new THREE.Vector3());
    const startX = -0.55;
    for (let i = 0; i < this.community.length; i++) {
      const m = makeCommunityCard();
      m.position.set(base.x + startX + i * 0.28, base.y, base.z);
      m.lookAt(this.camera.position);
      this.scene.add(m);
      this.visual.commCards.push(m);
    }
  }

  _updatePot() {
    this.visual.potLabel.userData.setText(`POT: $${this.pot}`);
  }

  _updateTags() {
    for (const p of this.players) {
      if (p.hiddenForPlayer) continue;
      this._setTag(p, `${nameOf(p)}\n$${p.chips}`);
    }
  }

  _setTag(p, txt) {
    p.label.userData.setText(txt);
  }

  _updateLeaderboard() {
    if (!this.onLeaderboard) return;

    const sorted = [...this.players]
      .filter(p => !p.hiddenForPlayer)
      .sort((a, b) => b.chips - a.chips);

    const lines = [
      "Boss Tournament",
      `1) ${nameOf(sorted[0])} — $${sorted[0]?.chips ?? 0}`,
      `2) ${nameOf(sorted[1])} — $${sorted[1]?.chips ?? 0}`,
      `3) ${nameOf(sorted[2])} — $${sorted[2]?.chips ?? 0}`,
      `4) ${nameOf(sorted[3])} — $${sorted[3]?.chips ?? 0}`,
      `5) ${nameOf(sorted[4])} — $${sorted[4]?.chips ?? 0}`
    ];
    this.onLeaderboard(lines);
  }

  _clearVisualCards() {
    for (const c of this.visual.cards) {
      if (c.parent) c.parent.remove(c);
      else this.scene.remove(c);
    }
    this.visual.cards = [];

    for (const c of this.visual.commCards) this.scene.remove(c);
    this.visual.commCards = [];
  }

  _getPlayerProxy() {
    // data-only “player” slot
    if (!this._playerProxy) this._playerProxy = { hand: [] };
    return this._playerProxy;
  }
}

// -----------------------------
// small utilities
// -----------------------------
function makeBot(i) {
  return { id: i, chips: 1000, bet: 0, inHand: true, hand: [] };
}

function nameOf(p) {
  return `Bot ${p.id + 1}`;
}

function drawCard() {
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];
  return ranks[Math.floor(Math.random() * ranks.length)] + suits[Math.floor(Math.random() * suits.length)];
}

function botMesh(i) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.65, 6, 12),
    new THREE.MeshStandardMaterial({
      color: pickBotColor(i),
      roughness: 0.45,
      metalness: 0.08,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    })
  );
  body.position.y = 0.95;
  g.add(body);

  return g;
}

function pickBotColor(i) {
  const colors = [0x00ffaa,0xff2bd6,0x2bd7ff,0xffd27a,0x9b7bff,0x6ef7a4,0xff6b6b,0x55aaff];
  return colors[i % colors.length];
}

function makeTag(text, w = 0.6) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), mat);
  mesh.userData = {
    canvas, ctx, tex,
    setText: (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(255,210,122,0.9)";
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lines = String(t).split("\n");
      const mid = canvas.height / 2;
      const gap = 52;
      const start = mid - ((lines.length - 1) * gap) / 2;

      lines.forEach((ln, idx) => ctx.fillText(ln, canvas.width / 2, start + idx * gap));
      tex.needsUpdate = true;
    }
  };
  mesh.userData.setText(text);
  return mesh;
}

function makeBillboardText(text, w = 0.8, h = 0.25) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

  mesh.userData = {
    canvas, ctx, tex,
    setText: (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(0,255,170,0.8)";
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 68px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(t), canvas.width / 2, canvas.height / 2);
      tex.needsUpdate = true;
    }
  };

  mesh.userData.setText(text);
  return mesh;
}

function makeCardBillboard() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, emissive: 0x111111, emissiveIntensity: 0.3 })
  );
  return m;
}

function makeCommunityCard() {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.0, emissive: 0x111111, emissiveIntensity: 0.25 })
  );
  }
