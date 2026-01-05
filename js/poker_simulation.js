// js/poker_simulation.js — Boss Poker Simulation (8.2) CRASH-PROOF
// Fixes:
// - No camera.getWorldPosition() usage (Quest-safe)
// - Community cards hover + face player
// - Pot/Action board higher + bigger
// - Single crown logic (rise + glow + auto-clear)
// - Tournament best-of-10 tracking (top3)
// - Defensive: never crash main loop

import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";

export const PokerSimulation = {
  enabled: true,

  // ---- Config ----
  seatCount: 6,
  startingChips: 20000,
  handsPerTournament: 10,

  // ---- Runtime ----
  scene: null,
  tableAnchors: null,
  seats: [],
  bots: [],
  community: [],
  pot: 0,
  handIndex: 0,
  street: "idle", // preflop/flop/turn/river/showdown
  actingSeat: 0,

  // visuals
  group: null,
  hudGroup: null,
  potMesh: null,
  actionMesh: null,
  crownMesh: null,
  crownTimer: 0,

  // cards visuals
  communityGroup: null,
  holeGroup: null,

  // tournament
  tour: {
    handInMatch: 0,
    wins: new Map(), // botId -> wins
    top3: [],
    finished: false,
  },

  // timing
  t: 0,
  phaseTimer: 0,

  // ---------- PUBLIC ----------
  init({ scene }) {
    this.scene = scene;
    this._ensureBuilt();
    this._resetTournament();
    this._startNewHand();
  },

  update(dt, ctx = {}) {
    if (!this.enabled) return;

    try {
      // lazy init if needed
      if (!this.scene && ctx.scene) this.scene = ctx.scene;
      if (!this.group) this._ensureBuilt();

      const cam = ctx.camera;
      const camPos = this._getObjectWorldPos(cam, new THREE.Vector3());
      const camYaw = this._getYawFromObject(cam);

      // face HUD + community toward player (yaw only)
      if (this.hudGroup) this.hudGroup.rotation.y = camYaw;
      if (this.communityGroup) this.communityGroup.rotation.y = camYaw;
      if (this.holeGroup) this.holeGroup.rotation.y = camYaw;

      // keep HUD anchored high above table
      this._positionHud();

      // crown animation
      if (this.crownMesh) {
        if (this.crownTimer > 0) {
          this.crownTimer -= dt;
          const p = Math.max(0, Math.min(1, 1 - this.crownTimer / 1.2));
          this.crownMesh.position.y = 2.2 + p * 0.35; // rises
          this.crownMesh.material.emissiveIntensity = 1.2 + p * 1.6;
          this.crownMesh.visible = true;
        } else {
          this.crownMesh.visible = false;
        }
      }

      // sim tick
      this.t += dt;
      this.phaseTimer -= dt;

      // if we somehow have no bots, rebuild
      if (!this.bots || this.bots.length === 0) this._buildBots();

      // advance phases
      if (this.phaseTimer <= 0) {
        this._advancePhase();
      }

      // highlight acting seat
      this._highlightActingSeat();

      // update HUD text
      this._setText(this.potMesh, `POT: ${this.pot.toLocaleString()}`);
      this._setText(this.actionMesh, this._currentActionText());

      // keep community hovering in front of player, above table
      this._positionCommunity(camPos);

    } catch (e) {
      // NEVER crash the game. Log once per second-ish.
      if (!this._errT) this._errT = 0;
      this._errT -= dt;
      if (this._errT <= 0) {
        console.warn("PokerSimulation update safe-catch:", e);
        this._errT = 1.0;
      }
    }
  },

  // ---------- BUILD ----------
  _ensureBuilt() {
    if (!this.scene) return;

    if (!this.group) {
      this.group = new THREE.Group();
      this.group.name = "PokerSimulationRoot";
      this.scene.add(this.group);
    }

    // Ensure boss table exists; if not, try build it
    if (!BossTable.group) {
      try { BossTable.build(this.scene); } catch (_) {}
    }

    this.tableAnchors = BossTable.getAnchors ? BossTable.getAnchors() : null;
    this.seats = (this.tableAnchors && this.tableAnchors.seats) ? this.tableAnchors.seats : [];

    // HUD group (pot/action)
    if (!this.hudGroup) {
      this.hudGroup = new THREE.Group();
      this.hudGroup.name = "PokerHUD";
      this.group.add(this.hudGroup);

      this.potMesh = this._makeTextBillboard("POT: 0", { size: 0.22, glow: 0x00ffaa });
      this.actionMesh = this._makeTextBillboard("WAITING…", { size: 0.17, glow: 0xff3366 });

      this.potMesh.position.set(0, 2.05, -0.2);
      this.actionMesh.position.set(0, 1.78, -0.2);

      this.hudGroup.add(this.potMesh);
      this.hudGroup.add(this.actionMesh);
    }

    // Community cards group
    if (!this.communityGroup) {
      this.communityGroup = new THREE.Group();
      this.communityGroup.name = "CommunityCardsGroup";
      this.group.add(this.communityGroup);
    }

    // Hole cards group (optional view: hovering above heads later)
    if (!this.holeGroup) {
      this.holeGroup = new THREE.Group();
      this.holeGroup.name = "HoleCardsGroup";
      this.group.add(this.holeGroup);
    }

    // Crown (single)
    if (!this.crownMesh) {
      this.crownMesh = this._makeCrown();
      this.crownMesh.visible = false;
      this.group.add(this.crownMesh);
    }

    // Build bots if needed
    if (!this.bots || this.bots.length === 0) {
      this._buildBots();
    }
  },

  _buildBots() {
    // Clear existing
    this.bots = [];
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const ch = this.group.children[i];
      if (ch && ch.name && ch.name.startsWith("Bot_")) this.group.remove(ch);
    }

    // Seat fallback if anchors missing
    const fallbackSeats = [];
    if (!this.seats || this.seats.length < this.seatCount) {
      const r = 3.1;
      for (let i = 0; i < this.seatCount; i++) {
        const a = (i / this.seatCount) * Math.PI * 2;
        fallbackSeats.push(new THREE.Vector3(Math.cos(a) * r, 0, -6.5 + Math.sin(a) * r));
      }
    }

    for (let i = 0; i < this.seatCount; i++) {
      const bot = this._makeBot(i);
      bot.chips = this.startingChips;
      bot.inHand = true;
      bot.wins = 0;

      // Position at seat
      const p = new THREE.Vector3();
      if (this.seats && this.seats[i]) {
        this.seats[i].getWorldPosition(p);
      } else {
        p.copy(fallbackSeats[i] || new THREE.Vector3(0, 0, -6.5));
      }
      bot.position.copy(p);
      bot.position.y = 0;

      this.group.add(bot);
      this.bots.push(bot);
    }
  },

  // ---------- SIM FLOW ----------
  _resetTournament() {
    this.tour.handInMatch = 0;
    this.tour.finished = false;
    this.tour.wins = new Map();
    for (let i = 0; i < this.seatCount; i++) this.tour.wins.set(i, 0);
    this._recomputeTop3();
  },

  _startNewHand() {
    this.handIndex++;
    this.tour.handInMatch++;

    // reset pot + board
    this.pot = 0;
    this.community = [];
    this.street = "preflop";
    this.actingSeat = Math.floor(Math.random() * this.seatCount);

    // reset bots
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      b.inHand = b.chips > 0;
      b.hand = this._deal2();
      this._setBotTag(b, `BOT ${i + 1}\n${b.chips.toLocaleString()} chips`);
    }

    // clear community visuals
    this._clearGroup(this.communityGroup);

    // clear crown
    this.crownTimer = 0;
    if (this.crownMesh) this.crownMesh.visible = false;

    // phase timing
    this.phaseTimer = 0.9;
  },

  _advancePhase() {
    if (this.tour.finished) {
      // after finished, loop again
      this._resetTournament();
      this._startNewHand();
      return;
    }

    // quick betting sim each phase
    this._simulateBettingRound();

    if (this.street === "preflop") {
      this.street = "flop";
      this.community.push(...this._deal3());
      this._renderCommunity();
      this.phaseTimer = 1.2;
      return;
    }
    if (this.street === "flop") {
      this.street = "turn";
      this.community.push(...this._deal1());
      this._renderCommunity();
      this.phaseTimer = 1.2;
      return;
    }
    if (this.street === "turn") {
      this.street = "river";
      this.community.push(...this._deal1());
      this._renderCommunity();
      this.phaseTimer = 1.2;
      return;
    }

    // showdown
    if (this.street === "river") {
      this.street = "showdown";
      const winner = this._pickWinner();
      const handName = this._handNameStub(); // placeholder now, upgrade later

      // award pot
      winner.chips += this.pot;
      this._setBotTag(winner, `BOT ${winner.botId + 1}\n${winner.chips.toLocaleString()} chips\nWINNER!`);

      // tournament win count
      this.tour.wins.set(winner.botId, (this.tour.wins.get(winner.botId) || 0) + 1);
      this._recomputeTop3();

      // crown above winner (single)
      this._placeCrownAboveWinner(winner);

      // action text includes hand name
      this._lastShowdownText = `BOT ${winner.botId + 1} WINS — ${handName}`;

      // check tournament end
      if (this.tour.handInMatch >= this.handsPerTournament) {
        this.tour.finished = true;
        this.phaseTimer = 2.5; // pause before restart
        return;
      }

      // pause then new hand
      this.phaseTimer = 2.0;
      this.street = "idle";
      return;
    }

    // idle -> new hand
    if (this.street === "idle") {
      this._startNewHand();
      return;
    }

    // default
    this.phaseTimer = 1.0;
  },

  _simulateBettingRound() {
    // Simple strategy stub: some fold, some call, some raise
    // (We’ll upgrade to real EV/strength later)
    const active = this.bots.filter(b => b.inHand && b.chips > 0);
    if (active.length <= 1) return;

    // choose actor
    const actor = this.bots[this.actingSeat % this.bots.length];
    this.actingSeat = (this.actingSeat + 1) % this.bots.length;

    if (!actor || !actor.inHand) return;

    const r = Math.random();
    if (r < 0.18) {
      actor.inHand = false; // fold
      this._lastActionText = `BOT ${actor.botId + 1} FOLDS`;
      return;
    }

    const baseBet = 250 + Math.floor(Math.random() * 450);
    const raise = (r > 0.78);

    const amt = raise ? baseBet * 2 : baseBet;
    const bet = Math.min(actor.chips, amt);

    actor.chips -= bet;
    this.pot += bet;

    this._setBotTag(actor, `BOT ${actor.botId + 1}\n${actor.chips.toLocaleString()} chips`);

    this._lastActionText = raise
      ? `BOT ${actor.botId + 1} RAISES ${bet.toLocaleString()}`
      : `BOT ${actor.botId + 1} CALLS ${bet.toLocaleString()}`;
  },

  _pickWinner() {
    // pick among active bots still in hand
    const active = this.bots.filter(b => b.inHand && b.chips >= 0);
    const winner = active[Math.floor(Math.random() * active.length)] || this.bots[0];
    return winner;
  },

  // ---------- VISUALS ----------
  _positionHud() {
    // Anchor HUD to boss table center
    const center = BossTable.getWorldCenter ? BossTable.getWorldCenter(new THREE.Vector3()) : new THREE.Vector3(0, 0, -6.5);
    if (this.hudGroup) {
      this.hudGroup.position.copy(center);
      this.hudGroup.position.y = 0; // we place text at y offsets
    }
  },

  _positionCommunity(camPos) {
    // community should hover above table, slightly toward player
    const center = BossTable.getWorldCenter ? BossTable.getWorldCenter(new THREE.Vector3()) : new THREE.Vector3(0, 0, -6.5);

    // vector from table to camera on XZ plane
    const toCam = new THREE.Vector3(camPos.x - center.x, 0, camPos.z - center.z);
    if (toCam.lengthSq() < 0.0001) toCam.set(0, 0, 1);
    toCam.normalize();

    // place community group toward camera side of table
    if (this.communityGroup) {
      this.communityGroup.position.copy(center);
      this.communityGroup.position.addScaledVector(toCam, 0.35);
      this.communityGroup.position.y = 1.62; // higher so you can see from distance
    }
  },

  _renderCommunity() {
    this._clearGroup(this.communityGroup);

    const cards = this.community.slice(0, 5);
    const spacing = 0.18;
    for (let i = 0; i < cards.length; i++) {
      const mesh = this._makeCardMesh(cards[i]);
      mesh.position.set((i - (cards.length - 1) / 2) * spacing, 0, 0);
      mesh.rotation.x = THREE.MathUtils.degToRad(-10);
      this.communityGroup.add(mesh);
    }
  },

  _placeCrownAboveWinner(winner) {
    if (!this.crownMesh || !winner) return;

    // Set crown to winner head position (approx)
    const p = new THREE.Vector3();
    winner.getWorldPosition(p);

    this.crownMesh.position.set(p.x, 2.2, p.z);
    this.crownMesh.visible = true;
    this.crownTimer = 1.2; // glow phase
  },

  _highlightActingSeat() {
    // optional: subtle glow on acting bot
    for (const b of this.bots) {
      const core = b.userData?.coreMesh;
      if (!core) continue;
      const acting = (b.botId === (this.actingSeat % this.seatCount));
      core.material.emissiveIntensity = acting ? 0.9 : 0.2;
      core.material.emissive.setHex(acting ? 0x00ffaa : 0x000000);
    }
  },

  // ---------- TEXT BILLBOARDS ----------
  _makeTextBillboard(text, { size = 0.18, glow = 0x00ffaa } = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      emissive: glow,
      emissiveIntensity: 0.9,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2.1 * size, 0.55 * size);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999;
    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;
    mesh.userData.size = size;

    this._drawBillboard(mesh, text, glow);
    return mesh;
  },

  _setText(mesh, text) {
    if (!mesh || mesh.userData?.lastText === text) return;
    mesh.userData.lastText = text;
    this._drawBillboard(mesh, text, mesh.material.emissive.getHex());
  },

  _drawBillboard(mesh, text, glowHex) {
    const ctx = mesh.userData.ctx;
    const canvas = mesh.userData.canvas;
    const tex = mesh.userData.tex;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // bg
    ctx.fillStyle = "rgba(8,10,16,0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // border glow
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,60,120,0.75)";
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // text
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "900 86px system-ui";
    ctx.fillText(text, canvas.width / 2, 160);

    tex.needsUpdate = true;

    // set emissive per update
    mesh.material.emissive.setHex(glowHex);
  },

  // ---------- BOT ----------
  _makeBot(i) {
    const bot = new THREE.Group();
    bot.name = `Bot_${i}`;
    bot.botId = i;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 22, 16),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / this.seatCount, 0.75, 0.55),
        roughness: 0.35,
        emissive: 0x000000,
        emissiveIntensity: 0.2,
      })
    );
    core.position.y = 1.05;
    bot.add(core);
    bot.userData.coreMesh = core;

    // name tag
    const tag = this._makeNameTag(`BOT ${i + 1}\n${this.startingChips.toLocaleString()} chips`);
    tag.position.set(0, 1.42, 0);
    bot.add(tag);
    bot.userData.tag = tag;

    return bot;
  },

  _makeNameTag(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), mat);
    mesh.renderOrder = 1000;

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;

    // draw once
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "rgba(0,255,170,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.font = "800 44px system-ui";

    const lines = String(text).split("\n");
    ctx.fillText(lines[0] || "", 256, 110);
    ctx.font = "700 34px system-ui";
    ctx.fillText(lines[1] || "", 256, 170);

    tex.needsUpdate = true;

    // IMPORTANT: do NOT tilt with head (yaw-only handling is in update via camera yaw)
    return mesh;
  },

  _setBotTag(bot, text) {
    const tag = bot?.userData?.tag;
    if (!tag) return;
    const ctx = tag.userData.ctx;
    const canvas = tag.userData.canvas;
    const tex = tag.userData.tex;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(0,255,170,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.textAlign = "center";

    const lines = String(text).split("\n");
    ctx.font = "900 44px system-ui";
    ctx.fillText(lines[0] || "", canvas.width / 2, 104);

    ctx.font = "800 34px system-ui";
    ctx.fillText(lines[1] || "", canvas.width / 2, 158);

    ctx.font = "900 34px system-ui";
    ctx.fillStyle = "rgba(255,60,120,0.95)";
    ctx.fillText(lines[2] || "", canvas.width / 2, 210);

    tex.needsUpdate = true;
  },

  // ---------- CARDS ----------
  _makeCardMesh(card) {
    // Card visual: simple, readable; we’ll upgrade to full pip art later
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");

    // white card
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, 512, 768);

    // border
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 484, 740);

    const { rank, suit } = card;
    const isRed = (suit === "♦" || suit === "♥");
    ctx.fillStyle = isRed ? "#cc1133" : "#111";

    // BIG rank + suit top-left
    ctx.font = "900 120px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(rank, 46, 140);

    ctx.font = "900 120px system-ui";
    ctx.fillText(suit, 46, 260);

    // center suit big
    ctx.font = "900 320px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(suit, 256, 520);

    // mirrored bottom-right
    ctx.save();
    ctx.translate(512, 768);
    ctx.rotate(Math.PI);
    ctx.textAlign = "left";
    ctx.font = "900 120px system-ui";
    ctx.fillText(rank, 46, 140);
    ctx.font = "900 120px system-ui";
    ctx.fillText(suit, 46, 260);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.24), mat);
    return mesh;
  },

  _deal2() { return [this._dealCard(), this._dealCard()]; },
  _deal3() { return [this._dealCard(), this._dealCard(), this._dealCard()]; },
  _deal1() { return [this._dealCard()]; },

  _dealCard() {
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    return {
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      suit: suits[Math.floor(Math.random() * suits.length)],
    };
  },

  // Placeholder for now (we’ll replace with real evaluator later)
  _handNameStub() {
    const names = ["PAIR", "TWO PAIR", "TRIPS", "STRAIGHT", "FLUSH", "FULL HOUSE", "QUADS", "STRAIGHT FLUSH"];
    return names[Math.floor(Math.random() * names.length)];
  },

  // ---------- Tournament ----------
  _recomputeTop3() {
    const arr = [];
    for (const [id, w] of this.tour.wins.entries()) arr.push({ id, w });
    arr.sort((a, b) => b.w - a.w);
    this.tour.top3 = arr.slice(0, 3);
  },

  _currentActionText() {
    if (this.tour.finished) {
      const t = this.tour.top3;
      const a = t[0] ? `#1 BOT ${t[0].id + 1} (${t[0].w})` : "#1 —";
      const b = t[1] ? `#2 BOT ${t[1].id + 1} (${t[1].w})` : "#2 —";
      const c = t[2] ? `#3 BOT ${t[2].id + 1} (${t[2].w})` : "#3 —";
      return `TOURNAMENT DONE • ${a} • ${b} • ${c}`;
    }
    if (this.street === "showdown") return this._lastShowdownText || "SHOWDOWN";
    return this._lastActionText || `HAND ${this.handIndex} • ${this.street.toUpperCase()}`;
  },

  // ---------- Utilities (CRASH-PROOF CAMERA) ----------
  _getObjectWorldPos(obj, out = new THREE.Vector3()) {
    // Works even if obj is not a THREE object (no crash)
    if (obj && obj.matrixWorld && obj.matrixWorld.elements) {
      return out.setFromMatrixPosition(obj.matrixWorld);
    }
    // common XR camera wrapper case: renderer.xr.getCamera() returns ArrayCamera with .cameras[]
    if (obj && obj.cameras && obj.cameras[0] && obj.cameras[0].matrixWorld) {
      return out.setFromMatrixPosition(obj.cameras[0].matrixWorld);
    }
    // fallback
    return out.set(0, 1.6, 0);
  },

  _getYawFromObject(obj) {
    // yaw-only to keep labels straight (no head tilt)
    try {
      const e = new THREE.Euler();
      const q = new THREE.Quaternion();
      if (obj && obj.quaternion) q.copy(obj.quaternion);
      else return 0;
      e.setFromQuaternion(q, "YXZ");
      return e.y;
    } catch {
      return 0;
    }
  },

  _clearGroup(g) {
    if (!g) return;
    while (g.children.length) {
      const c = g.children.pop();
      if (c?.geometry) c.geometry.dispose?.();
      if (c?.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose?.());
        else c.material.dispose?.();
      }
    }
  },

  _makeCrown() {
    // simple crown mesh (glowy)
    const crown = new THREE.Group();
    crown.name = "WinnerCrown";

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.035, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd24a,
        emissive: 0xffd24a,
        emissiveIntensity: 1.2,
        roughness: 0.25,
        metalness: 0.6,
      })
    );
    ring.rotation.x = Math.PI / 2;

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xffd24a,
      emissive: 0xffd24a,
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.6,
    });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 10), spikeMat);
      spike.position.set(Math.cos(a) * 0.11, 0.08, Math.sin(a) * 0.11);
      crown.add(spike);
    }

    crown.add(ring);
    return crown;
  },
};
