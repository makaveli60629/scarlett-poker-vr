// js/poker_simulation.js — Boss Tournament Poker Simulation (8.2.4 Straighten Pass)
// Fixes requested:
// - Bots/anchors no longer inside table (seat radius increased + seat faces table)
// - Chips on table in front of bot and slightly LEFT
// - Name tag, money label, hole cards spaced so they don't overlap
// - Community cards HOVER + face viewer (billboard)
// - Dealer is invisible (no dealer disk)
// - Pot centered on table (not off to side) + elevated so readable

import * as THREE from "./three.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function choice(a){ return a[Math.floor(Math.random()*a.length)]; }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }

function makeTextTexture(text, opts = {}) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");

  ctx.fillStyle = opts.bg ?? "rgba(8,10,16,0.82)";
  ctx.fillRect(0,0,w,h);

  ctx.lineWidth = 10;
  ctx.strokeStyle = opts.border1 ?? "rgba(0,255,170,0.70)";
  ctx.strokeRect(18,18,w-36,h-36);

  ctx.lineWidth = 6;
  ctx.strokeStyle = opts.border2 ?? "rgba(255,60,120,0.55)";
  ctx.strokeRect(30,30,w-60,h-60);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = opts.color ?? "rgba(255,255,255,0.94)";
  ctx.font = opts.font ?? "900 64px system-ui";
  ctx.fillText(text, w/2, h/2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeCardTexture(rank, suit) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 768;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(248,248,252,0.98)";
  ctx.fillRect(0,0,512,768);

  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.strokeRect(18,18,512-36,768-36);

  const red = (suit==="♥" || suit==="♦");
  const col = red ? "rgba(220,40,65,0.95)" : "rgba(30,30,34,0.95)";

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = col;
  ctx.font = "900 108px system-ui";
  ctx.fillText(rank, 52, 50);
  ctx.font = "900 104px system-ui";
  ctx.fillText(suit, 62, 165);

  ctx.save();
  ctx.translate(512,768);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = col;
  ctx.font = "900 108px system-ui";
  ctx.fillText(rank, 52, 50);
  ctx.font = "900 104px system-ui";
  ctx.fillText(suit, 62, 165);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = col;
  ctx.font = "900 260px system-ui";
  ctx.fillText(suit, 256, 390);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function denomStackPlan(amount) {
  const denoms = [
    { v: 5000, color: 0x101010 },
    { v: 1000, color: 0x6b1cff },
    { v: 500,  color: 0xff3344 },
    { v: 100,  color: 0x00b7ff },
    { v: 25,   color: 0x00ffaa },
    { v: 5,    color: 0xffffff },
  ];
  const out = [];
  let left = Math.max(0, Math.floor(amount));
  for (const d of denoms) {
    const c = Math.floor(left / d.v);
    if (c>0) { out.push({ denom:d.v, count:c, color:d.color }); left -= c*d.v; }
  }
  return out;
}

function buildChip(color) {
  const g = new THREE.CylinderGeometry(0.06, 0.06, 0.025, 22);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.05,
    emissive: color,
    emissiveIntensity: 0.10,
  });
  const chip = new THREE.Mesh(g, m);
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.007, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.03 })
  );
  stripe.rotation.x = Math.PI/2;
  stripe.position.y = 0.013;
  chip.add(stripe);
  return chip;
}

function buildCrown() {
  const crown = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd34d,
    roughness: 0.28,
    metalness: 0.25,
    emissive: 0xffcc44,
    emissiveIntensity: 0.75,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 18), mat);
  crown.add(base);

  for (let i=0;i<6;i++){
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 12), mat);
    const a = (i/6)*Math.PI*2;
    spike.position.set(Math.cos(a)*0.09, 0.07, Math.sin(a)*0.09);
    crown.add(spike);
  }

  const glow = new THREE.PointLight(0xffcc44, 1.0, 2.5);
  glow.position.set(0, 0.22, 0);
  crown.add(glow);

  crown.visible = false;
  return crown;
}

function buildTurnRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 44),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.95,
      roughness: 0.35,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI/2;
  ring.visible = false;
  return ring;
}

export const PokerSimulation = {
  group: null,
  tableCenter: new THREE.Vector3(0, 1.02, -6.5),

  seatCount: 5,
  startingChips: 20000,
  handTarget: 10,

  // layout
  seatRadius: 2.25,      // KEY FIX: bots not in table
  tableSurfaceY: 1.02,
  headY: 1.72,

  // signage spacing
  nameTagY: 1.95,
  moneyTagY: 1.45,
  cardsY: 1.68,

  // community cards hover
  communityY: 1.45,
  communityZ: -6.15,
  communitySpread: 0.44,

  // HUD smaller + higher
  hudY: 2.05,
  hudZ: -6.05,
  hudScale: 0.72,

  // pot in middle of table
  potPos: new THREE.Vector3(0, 1.10, -6.5),

  _t: 0,
  _phase: "prehand",
  _phaseT: 0,
  _hand: 0,
  _dealerIndex: 0,
  _turnIndex: 0,
  _pot: 0,

  seats: [],
  community: [],
  hud: null,
  hudTex: null,
  hudCanvas: null,
  hudCtx: null,

  turnRing: null,
  crown: null,
  crownOwner: -1,
  crownHoldT: 0,

  potGroups: [],

  build(parent, tableCenterVec3) {
    this.group = new THREE.Group();
    this.group.name = "PokerSimulation";
    parent.add(this.group);

    if (tableCenterVec3) this.tableCenter.copy(tableCenterVec3);

    // Build seats (anchors that face table center)
    this.seats = [];
    for (let i=0;i<this.seatCount;i++){
      const ang = (i/this.seatCount) * Math.PI * 2;

      // world position on ring
      const x = this.tableCenter.x + Math.cos(ang) * this.seatRadius;
      const z = this.tableCenter.z + Math.sin(ang) * this.seatRadius;

      const seat = {
        i,
        chips: this.startingChips,
        inHand: true,
        busted: false,

        pos: new THREE.Vector3(x, 0, z),

        g: new THREE.Group(),        // seat anchor
        nameTag: null,
        moneyTag: null,
        chipGroup: new THREE.Group(),
        holeCards: [],
      };

      seat.g.position.set(x, 0, z);

      // IMPORTANT: seat anchor faces table center so local axes are consistent
      seat.g.lookAt(new THREE.Vector3(this.tableCenter.x, 0, this.tableCenter.z));

      this.group.add(seat.g);

      // Name tag (higher)
      const nameTex = makeTextTexture(`BOT ${i+1}`, {
        w: 512, h: 256,
        bg: "rgba(10,12,18,0.70)",
        color: "rgba(0,255,170,0.95)",
        border1: "rgba(0,255,170,0.55)",
        border2: "rgba(255,60,120,0.40)",
        font: "900 74px system-ui",
      });

      const nameTag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.60, 0.30),
        new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, depthTest: false })
      );
      nameTag.position.set(0, this.nameTagY, 0.08);
      nameTag.renderOrder = 999;
      seat.g.add(nameTag);
      seat.nameTag = nameTag;

      // Money tag (lower, separate)
      const moneyTex = makeTextTexture(`$${seat.chips}`, {
        w: 512, h: 256,
        bg: "rgba(0,0,0,0.40)",
        color: "rgba(255,255,255,0.94)",
        border1: "rgba(0,255,170,0.25)",
        border2: "rgba(255,60,120,0.20)",
        font: "900 70px system-ui",
      });

      const moneyTag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.275),
        new THREE.MeshBasicMaterial({ map: moneyTex, transparent: true, depthTest: false })
      );
      moneyTag.position.set(0, this.moneyTagY, 0.08);
      moneyTag.renderOrder = 999;
      seat.g.add(moneyTag);
      seat.moneyTag = moneyTag;

      // Chips ON TABLE: in front of player and slightly LEFT
      // Because seat faces table, local -X is "left", local -Z is "toward table"
      seat.chipGroup.position.set(-0.26, this.tableSurfaceY - 0.98, -0.32);
      seat.g.add(seat.chipGroup);

      // Hole cards hover above head (separate from tags)
      for (let c=0;c<2;c++){
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(0.24, 0.34),
          new THREE.MeshStandardMaterial({ color: 0x23252c, roughness: 0.85 })
        );
        card.position.set((c===0?-0.14:0.14), this.cardsY, 0.10);
        seat.g.add(card);
        seat.holeCards.push(card);
      }

      this.seats.push(seat);
    }

    // Community cards (HOVER + face camera)
    this.community = [];
    for (let i=0;i<5;i++){
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(0.30, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
      );
      card.position.set(
        this.tableCenter.x + (i - 2) * this.communitySpread,
        this.communityY,
        this.communityZ
      );
      // will billboard in update()
      this.group.add(card);
      this.community.push(card);
    }

    // HUD board (smaller, higher)
    this.hudCanvas = document.createElement("canvas");
    this.hudCanvas.width = 1024; this.hudCanvas.height = 512;
    this.hudCtx = this.hudCanvas.getContext("2d");
    this.hudTex = new THREE.CanvasTexture(this.hudCanvas);
    this.hudTex.colorSpace = THREE.SRGBColorSpace;

    const hudMat = new THREE.MeshStandardMaterial({
      map: this.hudTex,
      transparent: true,
      opacity: 0.95,
      roughness: 0.85,
      emissive: 0x111018,
      emissiveIntensity: 0.7,
      depthWrite: false,
    });

    this.hud = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), hudMat);
    this.hud.position.set(this.tableCenter.x, this.hudY, this.hudZ);
    this.hud.scale.setScalar(this.hudScale);
    this.group.add(this.hud);

    // Turn ring
    this.turnRing = buildTurnRing();
    this.group.add(this.turnRing);

    // Crown
    this.crown = buildCrown();
    this.group.add(this.crown);

    // Initial
    this._drawHud("Skylark Live Table", "HAND 0/10", "Waiting…");
    this._refreshSeatVisuals();
    this._beginTournament();
  },

  _drawHud(title, line1, line2) {
    const ctx = this.hudCtx;
    if (!ctx) return;

    ctx.clearRect(0,0,1024,512);
    ctx.fillStyle = "rgba(8,10,16,0.86)";
    ctx.fillRect(0,0,1024,512);

    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,255,170,0.70)";
    ctx.strokeRect(18,18,988,476);

    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,60,120,0.55)";
    ctx.strokeRect(30,30,964,452);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,60,120,0.92)";
    ctx.font = "900 54px system-ui";
    ctx.fillText(title, 512, 92);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 74px system-ui";
    ctx.fillText(line1, 512, 240);

    ctx.fillStyle = "rgba(0,255,170,0.94)";
    ctx.font = "900 54px system-ui";
    ctx.fillText(line2, 512, 360);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "700 28px system-ui";
    ctx.fillText("Boss Tournament • Best of 10 hands", 512, 456);

    this.hudTex.needsUpdate = true;
  },

  _dealHole(seat) {
    for (let i=0;i<2;i++){
      const r = choice(RANKS);
      const s = choice(SUITS);
      const tex = makeCardTexture(r, s);
      seat.holeCards[i].material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
      seat.holeCards[i].material.needsUpdate = true;
    }
  },

  _dealCommunity() {
    for (let i=0;i<5;i++){
      const r = choice(RANKS);
      const s = choice(SUITS);
      const tex = makeCardTexture(r, s);
      this.community[i].material.map = tex;
      this.community[i].material.needsUpdate = true;
    }
  },

  _rebuildPotChips() {
    for (const g of this.potGroups) this.group.remove(g);
    this.potGroups = [];

    const plan = denomStackPlan(Math.min(this._pot, 60000)).slice(0,4);

    let si = 0;
    for (const p of plan) {
      const stackCount = clamp(Math.floor(p.count/2), 2, 16);

      const g = new THREE.Group();
      g.position.copy(this.potPos);

      // small "cluster" near center (not a stick)
      g.position.x += (si % 2) * 0.18 - 0.09;
      g.position.z += Math.floor(si/2) * 0.18 - 0.09;

      for (let k=0;k<stackCount;k++){
        const chip = buildChip(p.color);
        chip.position.set((Math.random()-0.5)*0.012, 0.014 + k*0.026, (Math.random()-0.5)*0.012);
        chip.rotation.y = Math.random()*Math.PI;
        g.add(chip);
      }

      this.group.add(g);
      this.potGroups.push(g);
      si++;
    }
  },

  _refreshSeatVisuals() {
    for (const s of this.seats) {
      // chips
      while (s.chipGroup.children.length) s.chipGroup.remove(s.chipGroup.children[0]);
      if (s.busted) continue;

      const plan = denomStackPlan(Math.min(s.chips, 26000)).slice(0,4);
      let idx = 0;

      for (const p of plan) {
        const stackCount = clamp(Math.floor(p.count/3), 3, 14);

        // seat local layout — front-left bank
        const baseX = -0.14 + (idx % 2) * 0.17;
        const baseZ = -0.06 + Math.floor(idx / 2) * 0.15;

        for (let k=0;k<stackCount;k++){
          const chip = buildChip(p.color);
          chip.position.set(
            baseX + (Math.random()-0.5)*0.012,
            0.014 + k*0.026,
            baseZ + (Math.random()-0.5)*0.012
          );
          chip.rotation.y = Math.random()*Math.PI;
          s.chipGroup.add(chip);
        }
        idx++;
      }

      // update money tag texture
      const tex = makeTextTexture(`$${s.chips}`, {
        w: 512, h: 256,
        bg: "rgba(0,0,0,0.40)",
        color: "rgba(255,255,255,0.94)",
        border1: "rgba(0,255,170,0.25)",
        border2: "rgba(255,60,120,0.20)",
        font: "900 70px system-ui",
      });
      s.moneyTag.material.map = tex;
      s.moneyTag.material.needsUpdate = true;
    }
  },

  _beginTournament() {
    this._hand = 0;
    this._pot = 0;
    this._dealerIndex = 0;
    this._turnIndex = 0;

    this.crownOwner = -1;
    this.crown.visible = false;

    for (const s of this.seats) {
      s.chips = this.startingChips;
      s.inHand = true;
      s.busted = false;
      this._dealHole(s);
    }
    this._dealCommunity();
    this._refreshSeatVisuals();
    this._rebuildPotChips();

    this._phase = "prehand";
    this._phaseT = 0;
  },

  _activeSeats() {
    return this.seats.filter(s => !s.busted && s.chips > 0);
  },

  _updateTurnRing() {
    const s = this.seats[this._turnIndex];
    if (!s || s.busted) { this.turnRing.visible = false; return; }

    // Put ring on table surface near that seat’s "bet line" area
    const wp = new THREE.Vector3();
    s.g.getWorldPosition(wp);

    const dir = this.tableCenter.clone().sub(new THREE.Vector3(wp.x, 0, wp.z));
    dir.y = 0;
    dir.normalize();

    const p = this.tableCenter.clone().add(dir.multiplyScalar(1.55));
    p.y = this.tableSurfaceY + 0.01;

    this.turnRing.position.copy(p);
    this.turnRing.visible = true;
  },

  _setCrown(ownerIndex) {
    this.crownOwner = ownerIndex;
    this.crownHoldT = 0;
    this.crown.visible = ownerIndex >= 0;
  },

  _updateCrown(dt, camera) {
    if (!this.crown.visible || this.crownOwner < 0) return;

    this.crownHoldT += dt;
    const t = clamp(this.crownHoldT / 0.9, 0, 1);
    const lift = 0.55 * easeOutCubic(t); // HIGHER per your request

    const s = this.seats[this.crownOwner];
    const wp = new THREE.Vector3();
    s.g.getWorldPosition(wp);

    this.crown.position.set(wp.x, 2.05 + lift, wp.z);
    this.crown.rotation.y += dt * 1.2;

    // pulse
    const light = this.crown.children.find(x => x.isLight);
    if (light) light.intensity = 0.9 + 0.5 * Math.sin(this._t * 4.0);

    // face camera
    if (camera) {
      const cam = new THREE.Vector3();
      camera.getWorldPosition(cam);
      cam.y = this.crown.position.y;
      this.crown.lookAt(cam);
    }
  },

  _chooseAction(seat) {
    const roll = Math.random();
    const pressure = clamp(1 - seat.chips / 20000, 0, 1);

    let foldP = 0.16 + pressure * 0.18;
    let raiseP = 0.30 - pressure * 0.14;
    let callP = 1 - foldP - raiseP;

    if (roll < foldP) return "FOLD";
    if (roll < foldP + callP) return "CALL";
    return "RAISE";
  },

  _betAmount(seat) {
    const base = 200 + Math.floor(Math.random()*900);
    return Math.min(seat.chips, base);
  },

  _advanceTurn() {
    let tries = 0;
    do {
      this._turnIndex = (this._turnIndex + 1) % this.seatCount;
      tries++;
      if (tries > this.seatCount + 1) break;
    } while (!this.seats[this._turnIndex].inHand || this.seats[this._turnIndex].busted);

    this._updateTurnRing();
  },

  _resolveHand() {
    const alive = this.seats.filter(s => s.inHand && !s.busted);
    const candidates = alive.length ? alive : this.seats.filter(s => !s.busted);

    const winner = candidates[Math.floor(Math.random()*candidates.length)];
    winner.chips += this._pot;

    // SINGLE crown winner only
    this._setCrown(winner.i);

    // bust logic (basic)
    for (const s of this.seats) {
      if (!s.busted && s.chips <= 0) {
        s.busted = true;
        s.inHand = false;
      }
    }

    this._drawHud(
      "Skylark Live Table",
      `WINNER: BOT ${winner.i+1}  +$${this._pot}`,
      `POT PAID • NEXT HAND SOON`
    );

    this._pot = 0;
    this._refreshSeatVisuals();
    this._rebuildPotChips();

    this._phase = "win_show";
    this._phaseT = 0;
  },

  update(dt, camera) {
    if (!this.group) return;

    this._t += dt;
    this._phaseT += dt;

    // Billboard tags/cards/community toward camera
    if (camera) {
      const cam = new THREE.Vector3();
      camera.getWorldPosition(cam);

      for (const s of this.seats) {
        if (s.nameTag) { const look = cam.clone(); look.y = s.nameTag.getWorldPosition(new THREE.Vector3()).y; s.nameTag.lookAt(look); }
        if (s.moneyTag) { const look = cam.clone(); look.y = s.moneyTag.getWorldPosition(new THREE.Vector3()).y; s.moneyTag.lookAt(look); }
        for (const c of s.holeCards) { const look = cam.clone(); look.y = c.getWorldPosition(new THREE.Vector3()).y; c.lookAt(look); }
      }

      for (const c of this.community) {
        const look = cam.clone();
        look.y = c.getWorldPosition(new THREE.Vector3()).y;
        c.lookAt(look);
      }

      if (this.hud) {
        const look = cam.clone();
        look.y = this.hud.position.y;
        this.hud.lookAt(look);
      }
    }

    this._updateCrown(dt, camera);

    // Phase machine
    if (this._phase === "prehand") {
      if (this._phaseT > 0.6) {
        this._phaseT = 0;
        this._hand++;
        this._pot = 0;

        // redeal
        for (const s of this.seats) {
          s.inHand = !s.busted;
          if (s.inHand) this._dealHole(s);
        }
        this._dealCommunity();

        // reset crown between hands
        this.crown.visible = false;
        this.crownOwner = -1;

        // start action
        this._turnIndex = (this._dealerIndex + 1) % this.seatCount;
        this._updateTurnRing();

        this._drawHud(
          "Skylark Live Table",
          `HAND ${this._hand}/${this.handTarget} • POT $${this._pot}`,
          `Action: BOT ${this._turnIndex+1}`
        );

        this._phase = "betting";
      }
    }

    if (this._phase === "betting") {
      if (this._phaseT > 0.85) {
        this._phaseT = 0;

        const s = this.seats[this._turnIndex];
        if (!s || s.busted || !s.inHand) {
          this._advanceTurn();
          return;
        }

        const action = this._chooseAction(s);
        if (action === "FOLD") {
          s.inHand = false;
        } else if (action === "CALL") {
          const amt = Math.min(s.chips, 80 + Math.floor(Math.random()*180));
          s.chips -= amt;
          this._pot += amt;
        } else {
          const amt = this._betAmount(s);
          s.chips -= amt;
          this._pot += amt;
        }

        this._refreshSeatVisuals();
        this._rebuildPotChips();

        this._drawHud(
          "Skylark Live Table",
          `HAND ${this._hand}/${this.handTarget} • POT $${this._pot}`,
          `BOT ${this._turnIndex+1} ${action}`
        );

        // resolve if 1 left or random checkpoint
        const left = this.seats.filter(x => x.inHand && !x.busted).length;
        if (left <= 1 || (Math.random() < 0.22)) {
          this._resolveHand();
        } else {
          this._advanceTurn();
        }
      }
    }

    if (this._phase === "win_show") {
      // hold crown, then next hand
      if (this._phaseT < 1.1 && this.crownOwner >= 0) {
        this.crown.visible = true;
      }
      if (this._phaseT > 8.5) {
        this._phaseT = 0;

        // advance dealer
        this._dealerIndex = (this._dealerIndex + 1) % this.seatCount;

        // tournament end check (simple)
        const alive = this._activeSeats();
        if (this._hand >= this.handTarget || alive.length <= 1) {
          // restart tournament loop (you asked loop/reset later)
          this._beginTournament();
        } else {
          this._phase = "prehand";
        }
      }
    }
  },
};
