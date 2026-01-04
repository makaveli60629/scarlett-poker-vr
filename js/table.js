// js/table.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * Table:
 * - Oval poker table (nice + clean)
 * - 6 seats (bots sit + one open for player)
 * - Runs poker loop: deal -> flop -> turn -> river -> showdown -> reset
 * - Community cards hover when you look at them
 * - Bot walkers roam the lobby
 */

export const Table = {
  group: null,
  tableTop: null,
  seats: [],
  bots: [],
  walkers: [],
  cards: {
    community: [],
    playerHole: [],
    deckPos: new THREE.Vector3(0.2, 0.86, -0.2),
    phase: "idle",
    t: 0,
    communityReveal: 0, // 0..5 cards revealed
  },

  // simple scoreboard data (teams)
  showdown: {
    teams: [
      { name: "Spades", points: 0 },
      { name: "Hearts", points: 0 },
      { name: "Clubs", points: 0 },
      { name: "Diamonds", points: 0 },
    ]
  },

  // Public API
  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "poker_table_group";
    scene.add(this.group);
    this.group.position.set(0, 0, -5.2);

    // table materials
    const felt = new THREE.MeshStandardMaterial({ color: 0x0f6a3e, roughness: 0.95, metalness: 0.0 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.65, metalness: 0.12 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.85, metalness: 0.06 });

    // oval top: use scaled cylinder
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.14, 48), felt);
    top.scale.set(1.45, 1, 1.0); // elongated oval
    top.position.set(0, 0.86, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    top.name = "table_top";
    this.group.add(top);
    this.tableTop = top;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 18, 64), trim);
    rim.scale.set(1.45, 1.0, 1.0);
    rim.position.set(0, 0.93, 0);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    this.group.add(rim);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.75, 22), wood);
    base.position.set(0, 0.38, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    // chairs (6)
    this._makeSeats(scene);

    // bots: 5 seated + 1 open seat for player
    this._spawnBots(scene);

    // walkers: 2 roamers
    this._spawnWalkers(scene);

    // cards
    this._initCards(scene);

    // start loop
    this._startNewHand();

    return this.group;
  },

  update(dt, camera) {
    if (!this.group) return;

    // walkers roam
    for (const w of this.walkers) {
      w.t += dt;
      const p = w.mesh.position;
      p.x += Math.cos(w.t * 0.7 + w.seed) * 0.15 * dt;
      p.z += Math.sin(w.t * 0.6 + w.seed) * 0.15 * dt;
      // keep in bounds
      p.x = THREE.MathUtils.clamp(p.x, -10, 10);
      p.z = THREE.MathUtils.clamp(p.z, -10, 10);
      w.mesh.rotation.y = Math.atan2(w.vx, w.vz);
    }

    // poker loop timing
    this.cards.t += dt;
    this._advancePhases(dt);

    // hover community cards if you look at them
    this._hoverCommunityOnGaze(camera);

    // keep name tags upright (no tilt)
    for (const b of this.bots) {
      if (b.tag) {
        b.tag.rotation.set(0, 0, 0);
        b.tag.lookAt(camera.position.x, b.tag.position.y, camera.position.z);
        // do NOT tilt with bot body
      }
    }
  },

  getLeaderboardData() {
    return {
      title: "SHOWDOWN LEADERBOARD",
      rows: this.showdown.teams.map(t => ({ name: t.name, points: t.points })),
      footer: "Top 10 paid Sunday night • Event Chips awarded"
    };
  },

  // Placeholder seat action called by main.js
  sitPlayer() {
    // You can connect your player rig seat locking later.
    // For now this signals seat open.
    // (In this prototype, the player spectates.)
  },

  /* ---------------- Seats / Bots ---------------- */

  _makeSeats(scene) {
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 1.0 });
    const seatAccent = new THREE.MeshStandardMaterial({ color: 0x202332, roughness: 0.9, metalness: 0.05 });

    const seats = [];
    const radiusX = 2.3 * 1.25;
    const radiusZ = 2.0 * 1.0;

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * radiusX;
      const z = Math.sin(a) * radiusZ;

      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(x, z) + Math.PI; // face table

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), seatMat);
      seat.position.y = 0.5;
      seat.castShadow = true;
      seat.receiveShadow = true;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.12), seatAccent);
      back.position.set(0, 0.82, -0.22);
      back.castShadow = true;
      g.add(back);

      g.name = `chair_${i}`;
      // Make one join seat interactive (seat 0)
      if (i === 0) {
        g.name = "chair_join_0";
        seat.userData.interactive = true;
        seat.userData.joinSeat = true;
        seat.name = "chair_join_0_hit";
      }

      this.group.add(g);
      seats.push({ group: g, seatMesh: seat });
    }

    this.seats = seats;
  },

  _spawnBots(scene) {
    this.bots = [];
    const botColors = [0x5da8ff, 0xff6bc6, 0x55ffb2, 0xffb84d, 0xbda6ff];

    for (let i = 1; i < 6; i++) { // seat 0 left open
      const seat = this.seats[i];
      const bot = this._makeBot(`Bot_${i}`, botColors[i - 1]);
      bot.group.position.copy(seat.group.position);
      bot.group.rotation.copy(seat.group.rotation);
      this.group.add(bot.group);
      this.bots.push(bot);
    }
  },

  _spawnWalkers(scene) {
    this.walkers = [];
    for (let i = 0; i < 2; i++) {
      const bot = this._makeBot(`Walker_${i+1}`, 0x00ffaa);
      bot.group.position.set(-6 + i * 3, 0, 6);
      bot.group.rotation.y = Math.PI;
      this.walkers.push({ mesh: bot.group, t: 0, seed: Math.random() * 10, vx: 0, vz: 1 });
      scene.add(bot.group);
    }
  },

  _makeBot(name, color) {
    const g = new THREE.Group();
    g.name = name;

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 14), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 18), bodyMat);
    head.position.y = 1.25;
    head.castShadow = true;
    g.add(head);

    // Name tag (upright)
    const tag = this._makeNameTag(name);
    tag.position.set(0, 1.55, 0);
    g.add(tag);

    return { group: g, tag };
  },

  _makeNameTag(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 108);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 54px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 80);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.24), mat);
    plane.renderOrder = 900;
    plane.name = "name_tag";
    return plane;
  },

  /* ---------------- Poker Cards ---------------- */

  _initCards(scene) {
    this.cards.community = [];
    this.cards.playerHole = [];

    // Community card positions on felt
    const startX = -0.55;
    for (let i = 0; i < 5; i++) {
      const card = this._makeCardMesh("??");
      card.position.set(startX + i * 0.275, 0.93, 0.02);
      card.rotation.x = -Math.PI / 2;
      card.userData.isCommunityCard = true;
      card.userData.cardIndex = i;
      this.group.add(card);
      this.cards.community.push(card);
    }

    // Player hole cards area (in front of join seat)
    for (let i = 0; i < 2; i++) {
      const card = this._makeCardMesh("P?");
      card.position.set(-0.12 + i * 0.28, 0.93, 0.55);
      card.rotation.x = -Math.PI / 2;
      card.userData.isPlayerCard = true;
      card.userData.canFlip = true; // action can flip later
      // start face down
      card.userData.faceUp = false;
      this._setCardFace(card, "BACK");
      this.group.add(card);
      this.cards.playerHole.push(card);
    }
  },

  _makeCardMesh(label) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 356;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.0,
      emissive: 0x101018,
      emissiveIntensity: 0.25
    });

    const geo = new THREE.PlaneGeometry(0.24, 0.33);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.tex = tex;

    this._drawCardCanvas(mesh, label, false);
    return mesh;
  },

  _drawCardCanvas(mesh, label, isRed) {
    const ctx = mesh.userData.ctx;
    ctx.clearRect(0, 0, 256, 356);

    // card base (high contrast)
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.fillRect(0, 0, 256, 356);

    // border
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 336);

    // label
    ctx.fillStyle = isRed ? "rgba(255,30,70,0.95)" : "rgba(0,0,0,0.92)";
    ctx.font = "bold 64px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, 24, 80);

    // center icon
    ctx.textAlign = "center";
    ctx.font = "bold 140px system-ui";
    ctx.fillText(label.includes("♦") ? "♦" : label.includes("♥") ? "♥" : label.includes("♣") ? "♣" : label.includes("♠") ? "♠" : "?", 128, 230);

    mesh.userData.tex.needsUpdate = true;
  },

  _setCardFace(mesh, face) {
    // Face could be "BACK" or e.g. "A♠"
    if (face === "BACK") {
      const ctx = mesh.userData.ctx;
      ctx.clearRect(0, 0, 256, 356);
      ctx.fillStyle = "rgba(10,10,18,0.95)";
      ctx.fillRect(0, 0, 256, 356);
      ctx.strokeStyle = "rgba(0,255,170,0.85)";
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, 236, 336);
      ctx.fillStyle = "rgba(255,60,120,0.9)";
      ctx.font = "bold 54px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("TEAM NOVA", 128, 150);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 44px system-ui";
      ctx.fillText("SCARLETT POKER VR", 128, 220);
      mesh.userData.tex.needsUpdate = true;
      return;
    }

    const isRed = face.includes("♦") || face.includes("♥");
    this._drawCardCanvas(mesh, face, isRed);
  },

  _advancePhases(dt) {
    const c = this.cards;

    // Timing (simple)
    // deal (2s) -> flop (3s) -> turn (3s) -> river (3s) -> showdown (4s) -> reset
    if (c.phase === "deal" && c.t > 2.0) {
      c.phase = "flop";
      c.t = 0;
      c.communityReveal = 3;
      this._revealCommunity();
    } else if (c.phase === "flop" && c.t > 3.0) {
      c.phase = "turn";
      c.t = 0;
      c.communityReveal = 4;
      this._revealCommunity();
    } else if (c.phase === "turn" && c.t > 3.0) {
      c.phase = "river";
      c.t = 0;
      c.communityReveal = 5;
      this._revealCommunity();
    } else if (c.phase === "river" && c.t > 3.0) {
      c.phase = "showdown";
      c.t = 0;
      this._showdown();
    } else if (c.phase === "showdown" && c.t > 4.0) {
      this._startNewHand();
    }
  },

  _startNewHand() {
    const c = this.cards;
    c.phase = "deal";
    c.t = 0;
    c.communityReveal = 0;

    // reset community to back
    for (let i = 0; i < 5; i++) this._setCardFace(this.cards.community[i], "BACK");

    // give a random player hand (two cards) face down
    for (const pc of this.cards.playerHole) {
      pc.userData.faceUp = false;
      this._setCardFace(pc, "BACK");
    }

    // pre-generate “deck” results
    this._deck = this._makeDeck();
    this._deckIndex = 0;

    // burn + assign player hole
    const p1 = this._draw(); const p2 = this._draw();
    this.cards.playerHole[0].userData.cardFace = p1;
    this.cards.playerHole[1].userData.cardFace = p2;

    // assign community faces
    const community = [];
    for (let i = 0; i < 5; i++) community.push(this._draw());
    this._communityFaces = community;
  },

  _revealCommunity() {
    for (let i = 0; i < 5; i++) {
      if (i < this.cards.communityReveal) this._setCardFace(this.cards.community[i], this._communityFaces[i]);
      else this._setCardFace(this.cards.community[i], "BACK");
    }
  },

  _showdown() {
    // Award random points to a random team (placeholder for your real showdown system)
    const idx = Math.floor(Math.random() * this.showdown.teams.length);
    const pts = Math.floor(500 + Math.random() * 5000);
    this.showdown.teams[idx].points += pts;

    // Visual: lift all community cards briefly
    for (const card of this.cards.community) card.userData._hoverBoost = 0.08;
  },

  _hoverCommunityOnGaze(camera) {
    if (!camera) return;

    // ray from camera forward
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);

    // For each community card, see if it's near the ray (cheap gaze test)
    for (const card of this.cards.community) {
      const p = new THREE.Vector3();
      card.getWorldPosition(p);

      const v = p.clone().sub(origin);
      const proj = v.dot(dir);
      const closest = origin.clone().add(dir.clone().multiplyScalar(Math.max(0, proj)));
      const dist = p.distanceTo(closest);

      const looking = proj > 0.5 && proj < 8.0 && dist < 0.22;
      const baseY = 0.93;
      const targetY = looking ? 1.02 : baseY;
      card.position.y += (targetY - card.position.y) * 0.12;

      // decay showdown hover boost
      if (card.userData._hoverBoost) {
        card.position.y += card.userData._hoverBoost;
        card.userData._hoverBoost *= 0.86;
        if (card.userData._hoverBoost < 0.002) card.userData._hoverBoost = 0;
      }
    }
  },

  // simple deck
  _makeDeck() {
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    const deck = [];
    for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);

    // shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  },

  _draw() {
    const card = this._deck[this._deckIndex % this._deck.length];
    this._deckIndex++;
    return card;
  },
};
