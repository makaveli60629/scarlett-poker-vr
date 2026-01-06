// js/poker_simulation.js — Boss Tournament Poker Simulation (8.2.3 Polish)
// Goals:
// - Community cards always visible + spaced
// - Pot + Action HUD hover above table (smaller, not blocking)
// - Chip stacks: fluffed, color-coded denominations, grouped stacks (no "long stick")
// - Turn indicator ring per seat
// - Dealer button rotates
// - Crown: single winner, rises higher, glows, disappears before next hand
// - Losers: walk away, return next match cycle
//
// NOTE: This is a VISUAL SIM + lightweight logic (not full poker rules yet).
// It's designed to be stable + pretty for GitHub Pages / Quest.

import * as THREE from "./three.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function randInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }

function makeTextTexture(text, opts = {}) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 512;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  // bg
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = opts.bg ?? "rgba(8,10,16,0.80)";
  ctx.fillRect(0,0,w,h);

  // border glow
  ctx.lineWidth = 10;
  ctx.strokeStyle = opts.border1 ?? "rgba(0,255,170,0.60)";
  ctx.strokeRect(18,18,w-36,h-36);

  ctx.lineWidth = 6;
  ctx.strokeStyle = opts.border2 ?? "rgba(255,60,120,0.55)";
  ctx.strokeRect(30,30,w-60,h-60);

  // text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = opts.color ?? "rgba(255,255,255,0.92)";
  ctx.font = opts.font ?? "800 64px system-ui";
  ctx.fillText(text, w/2, h/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeCardTexture(rank, suit) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 768;
  const ctx = canvas.getContext("2d");

  // card base
  ctx.fillStyle = "rgba(245,245,252,0.98)";
  ctx.fillRect(0,0,512,768);

  // border
  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeRect(18,18,512-36,768-36);

  const isRed = (suit === "♥" || suit === "♦");
  const suitColor = isRed ? "rgba(220,40,65,0.95)" : "rgba(30,30,34,0.95)";

  // rank + suit big (top-left)
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = suitColor;
  ctx.font = "900 96px system-ui";
  ctx.fillText(rank, 52, 50);

  ctx.font = "900 92px system-ui";
  ctx.fillText(suit, 62, 150);

  // mirrored bottom-right
  ctx.save();
  ctx.translate(512, 768);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = suitColor;
  ctx.font = "900 96px system-ui";
  ctx.fillText(rank, 52, 50);
  ctx.font = "900 92px system-ui";
  ctx.fillText(suit, 62, 150);
  ctx.restore();

  // center suit
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = suitColor;
  ctx.font = "900 240px system-ui";
  ctx.fillText(suit, 256, 390);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function denomStackPlan(amount) {
  // simple denom plan for visuals
  const denoms = [
    { v: 5000, color: 0x111111 }, // black
    { v: 1000, color: 0x6b1cff }, // purple
    { v: 500,  color: 0xff3344 }, // red
    { v: 100,  color: 0x00b7ff }, // blue
    { v: 25,   color: 0x00ffaa }, // green
    { v: 5,    color: 0xffffff }, // white
  ];
  const out = [];
  let left = Math.max(0, Math.floor(amount));
  for (const d of denoms) {
    const c = Math.floor(left / d.v);
    if (c > 0) {
      out.push({ denom: d.v, count: c, color: d.color });
      left -= c * d.v;
    }
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
    emissiveIntensity: 0.12,
  });
  const chip = new THREE.Mesh(g, m);
  chip.castShadow = false;
  chip.receiveShadow = false;

  // edge stripe hint
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.007, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.0, emissive: 0xffffff, emissiveIntensity: 0.03 })
  );
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.013;
  chip.add(stripe);

  return chip;
}

function buildDealerButton() {
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.02, 30),
    new THREE.MeshStandardMaterial({
      color: 0xffdd66,
      roughness: 0.35,
      emissive: 0xffcc44,
      emissiveIntensity: 0.35,
    })
  );
  disk.rotation.x = Math.PI/2;

  const tex = makeTextTexture("DEALER", {
    w: 512, h: 256,
    bg: "rgba(20,16,6,0.90)",
    color: "rgba(0,0,0,0.9)",
    border1: "rgba(0,0,0,0.25)",
    border2: "rgba(0,0,0,0.18)",
    font: "900 66px system-ui",
  });

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.15),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  label.position.z = 0.012;
  disk.add(label);

  return disk;
}

function buildTurnRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 44),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.85,
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

function buildCrown() {
  // simple crown mesh (no GLTF) — stable
  const crown = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.06, 18),
    new THREE.MeshStandardMaterial({
      color: 0xffd34d,
      roughness: 0.28,
      metalness: 0.25,
      emissive: 0xffcc44,
      emissiveIntensity: 0.65,
    })
  );
  crown.add(base);

  for (let i=0;i<6;i++){
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.08, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffd34d,
        roughness: 0.28,
        metalness: 0.25,
        emissive: 0xffcc44,
        emissiveIntensity: 0.65,
      })
    );
    const a = (i/6)*Math.PI*2;
    spike.position.set(Math.cos(a)*0.09, 0.07, Math.sin(a)*0.09);
    spike.rotation.x = 0;
    spike.rotation.z = 0;
    crown.add(spike);
  }

  const glow = new THREE.PointLight(0xffcc44, 0.9, 2.2);
  glow.position.set(0, 0.2, 0);
  crown.add(glow);

  crown.visible = false;
  return crown;
}

export const PokerSimulation = {
  group: null,
  tableCenter: new THREE.Vector3(0, 1.02, -6.5),
  // card layout
  communityY: 1.20,
  communityZ: -6.15,
  communitySpread: 0.40, // spacing between community cards (polish)
  // HUD
  hudY: 1.85,
  hudZ: -6.05,
  hudScale: 0.70, // smaller so it doesn't block
  // chips
  potPos: new THREE.Vector3(0.85, 1.12, -6.02), // offset so it doesn't cover community
  playerChipRadius: 0.75,
  // sim
  seatCount: 5,
  startingChips: 20000,
  ante: 50,
  blindSmall: 100,
  blindBig: 200,
  handTarget: 10,

  // runtime
  _t: 0,
  _phaseT: 0,
  _phase: "idle",
  _hand: 0,
  _dealerIndex: 0,
  _turnIndex: 0,
  _pot: 0,

  seats: [],
  community: [],
  communityBacks: [],
  potStacks: [],
  hud: null,
  hudTex: null,
  hudCanvas: null,
  hudCtx: null,

  dealerButton: null,
  turnRing: null,

  crown: null,
  crownOwner: -1,
  crownHoldT: 0,

  build(scene, tableCenterVec3) {
    this.group = new THREE.Group();
    this.group.name = "PokerSimulation";
    scene.add(this.group);

    if (tableCenterVec3) this.tableCenter.copy(tableCenterVec3);

    // Seats positions around table (bots sit)
    const seatRadius = 1.55;
    this.seats = [];
    for (let i=0;i<this.seatCount;i++){
      const ang = (i/this.seatCount) * Math.PI*2;
      const px = Math.cos(ang) * seatRadius;
      const pz = Math.sin(ang) * seatRadius;

      const seat = {
        i,
        chips: this.startingChips,
        inHand: true,
        busted: false,
        walkAway: false,
        walkT: 0,

        // seat marker position on table rim plane
        pos: new THREE.Vector3(this.tableCenter.x + px, 0, this.tableCenter.z + pz),

        // visual group
        g: new THREE.Group(),
        chipGroup: new THREE.Group(),
        nameTag: null,
        handCards: [],
      };

      seat.g.position.set(seat.pos.x, 0, seat.pos.z);
      this.group.add(seat.g);

      // name tag (hover, billboarded)
      const nameTex = makeTextTexture(`BOT ${i+1}`, {
        w: 512, h: 256,
        bg: "rgba(10,12,18,0.72)",
        color: "rgba(0,255,170,0.92)",
        border1: "rgba(0,255,170,0.55)",
        border2: "rgba(255,60,120,0.45)",
        font: "900 72px system-ui",
      });

      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.275),
        new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, depthTest: false })
      );
      tag.position.set(0, 1.35, 0);
      tag.renderOrder = 999;
      seat.g.add(tag);
      seat.nameTag = tag;

      // chip group (fluffed stacks)
      seat.chipGroup.position.set(0, 1.03, 0); // on table surface
      seat.g.add(seat.chipGroup);

      // two hole cards hover above head (for now) so you can observe
      for (let c=0;c<2;c++){
        const back = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 0.32),
          new THREE.MeshStandardMaterial({ color: 0x22242b, roughness: 0.85 })
        );
        back.position.set((c===0?-0.13:0.13), 1.55, 0.08);
        back.rotation.y = Math.PI; // face camera-ish after billboard update
        seat.g.add(back);
        seat.handCards.push(back);
      }

      this.seats.push(seat);
    }

    // Community cards (always visible)
    for (let i=0;i<5;i++){
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.40), m);
      card.position.set(
        this.tableCenter.x + (i - 2) * this.communitySpread,
        this.communityY,
        this.communityZ
      );
      card.rotation.x = -Math.PI/2;
      this.group.add(card);
      this.community.push(card);
    }

    // HUD board (smaller, higher, not blocking)
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
      depthTest: true,
      depthWrite: false,
    });

    this.hud = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), hudMat);
    this.hud.position.set(this.tableCenter.x, this.hudY, this.hudZ);
    this.hud.rotation.y = Math.PI; // face player spawn direction typically
    this.hud.scale.setScalar(this.hudScale);
    this.group.add(this.hud);

    // Dealer button (rotates)
    this.dealerButton = buildDealerButton();
    this.dealerButton.position.set(this.tableCenter.x, 1.02, this.tableCenter.z + 0.55);
    this.dealerButton.rotation.y = Math.PI;
    this.group.add(this.dealerButton);

    // Turn ring
    this.turnRing = buildTurnRing();
    this.group.add(this.turnRing);

    // Crown
    this.crown = buildCrown();
    this.group.add(this.crown);

    // initial draw
    this._drawHud("Skylark Live Table", `Hand 0/${this.handTarget}`, "Waiting…");
    this._refreshSeatChips();

    // start immediately
    this._beginTournament();
  },

  _beginTournament() {
    this._hand = 0;
    this._dealerIndex = 0;
    this.crownOwner = -1;
    this.crown.visible = false;

    for (const s of this.seats) {
      s.chips = this.startingChips;
      s.inHand = true;
      s.busted = false;
      s.walkAway = false;
      s.walkT = 0;
    }

    this._phase = "prehand";
    this._phaseT = 0;
    this._t = 0;
  },

  _drawHud(title, line1, line2) {
    const ctx = this.hudCtx;
    if (!ctx) return;

    ctx.clearRect(0,0,1024,512);
    ctx.fillStyle = "rgba(8,10,16,0.86)";
    ctx.fillRect(0,0,1024,512);

    // neon border
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,255,170,0.70)";
    ctx.strokeRect(18,18,988,476);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,60,120,0.55)";
    ctx.strokeRect(30,30,964,452);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,60,120,0.92)";
    ctx.font = "900 56px system-ui";
    ctx.fillText(title, 512, 95);

    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = "900 72px system-ui";
    ctx.fillText(line1, 512, 235);

    ctx.fillStyle = "rgba(0,255,170,0.92)";
    ctx.font = "800 52px system-ui";
    ctx.fillText(line2, 512, 355);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "700 28px system-ui";
    ctx.fillText("Boss Tournament • Best of 10 hands", 512, 455);

    this.hudTex.needsUpdate = true;
  },

  _handNameSimple() {
    // placeholder hand label (we’ll plug real evaluator later)
    const pool = [
      "High Card", "Pair", "Two Pair", "Trips", "Straight",
      "Flush", "Full House", "Quads", "Straight Flush"
    ];
    return choice(pool);
  },

  _dealNewCommunity() {
    for (let i=0;i<5;i++){
      const r = choice(RANKS);
      const s = choice(SUITS);
      const tex = makeCardTexture(r, s);
      this.community[i].material.map = tex;
      this.community[i].material.needsUpdate = true;

      // spread spacing (already)
      this.community[i].position.x = this.tableCenter.x + (i - 2) * this.communitySpread;
      this.community[i].position.y = this.communityY;
      this.community[i].position.z = this.communityZ;
      this.community[i].rotation.x = -Math.PI/2;
    }
  },

  _dealHole(seat) {
    for (let i=0;i<2;i++){
      const r = choice(RANKS);
      const s = choice(SUITS);
      const tex = makeCardTexture(r, s);
      seat.handCards[i].material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
      seat.handCards[i].material.needsUpdate = true;
    }
  },

  _refreshSeatChips() {
    // rebuild chip stacks per seat based on current chip amount.
    for (const s of this.seats) {
      while (s.chipGroup.children.length) s.chipGroup.remove(s.chipGroup.children[0]);

      if (s.busted) continue;

      // We only render up to a limit for perf (visual)
      const plan = denomStackPlan(Math.min(s.chips, 25000));
      const stacks = plan.slice(0, 4);

      // Place stacks fluffed in a small “bank” near each seat position on table
      // (not one long stick)
      let stackIndex = 0;
      for (const p of stacks) {
        const stackCount = clamp(Math.floor(p.count / 3), 3, 14); // visual stack height
        const baseX = -0.18 + (stackIndex % 2) * 0.18;
        const baseZ = -0.08 + Math.floor(stackIndex / 2) * 0.16;

        // stack with slight random wobble
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
        stackIndex++;
      }

      // Small numeric hover (chips)
      const labelTex = makeTextTexture(`$${s.chips}`, {
        w: 512, h: 256,
        bg: "rgba(0,0,0,0.45)",
        color: "rgba(255,255,255,0.94)",
        border1: "rgba(0,255,170,0.30)",
        border2: "rgba(255,60,120,0.25)",
        font: "900 72px system-ui",
      });

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.45, 0.225),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false })
      );
      label.position.set(0, 0.58, 0);
      label.renderOrder = 999;
      s.chipGroup.add(label);
    }
  },

  _rebuildPotChips() {
    // pot chips are a few stacks, offset to avoid covering community cards
    // Clear old
    for (const mesh of this.potStacks) this.group.remove(mesh);
    this.potStacks = [];

    const plan = denomStackPlan(Math.min(this._pot, 60000)).slice(0,4);
    let si = 0;

    for (const p of plan) {
      const stackCount = clamp(Math.floor(p.count/2), 2, 16);

      const g = new THREE.Group();
      g.position.copy(this.potPos);
      g.position.x += (si % 2) * 0.16;
      g.position.z += Math.floor(si/2) * 0.16;

      for (let k=0;k<stackCount;k++){
        const chip = buildChip(p.color);
        chip.position.set((Math.random()-0.5)*0.01, 0.014 + k*0.026, (Math.random()-0.5)*0.01);
        chip.rotation.y = Math.random()*Math.PI;
        g.add(chip);
      }

      this.group.add(g);
      this.potStacks.push(g);
      si++;
    }
  },

  _seatWorldPos(seatIndex) {
    return this.seats[seatIndex]?.pos?.clone() ?? this.tableCenter.clone();
  },

  _updateDealerButton() {
    const pos = this._seatWorldPos(this._dealerIndex);
    // place on inner edge near dealer
    const dir = pos.clone().sub(this.tableCenter);
    dir.y = 0;
    dir.normalize();
    const p = this.tableCenter.clone().add(dir.multiplyScalar(0.85));
    p.y = 1.02;
    this.dealerButton.position.copy(p);
    this.dealerButton.rotation.y = Math.atan2(dir.x, dir.z); // face outward
  },

  _updateTurnRing() {
    const pos = this._seatWorldPos(this._turnIndex);
    const dir = pos.clone().sub(this.tableCenter);
    dir.y = 0;
    dir.normalize();
    const p = this.tableCenter.clone().add(dir.multiplyScalar(0.92));
    p.y = 1.021;
    this.turnRing.position.copy(p);
    this.turnRing.visible = true;
  },

  _setCrown(seatIndex) {
    this.crownOwner = seatIndex;
    this.crownHoldT = 0;
    this.crown.visible = (seatIndex >= 0);
  },

  _updateCrown(dt, camera) {
    if (!this.crown.visible || this.crownOwner < 0) return;

    const s = this.seats[this.crownOwner];
    if (!s) return;

    // crown sits above the winner, rises a bit, glows
    this.crownHoldT += dt;
    const t = clamp(this.crownHoldT / 0.9, 0, 1);
    const lift = 0.35 * easeOutCubic(t);

    const wp = new THREE.Vector3();
    s.g.getWorldPosition(wp);

    this.crown.position.set(wp.x, 1.85 + lift, wp.z);
    this.crown.rotation.y += dt * 1.2;

    // pulse emissive via light intensity
    const pulse = 0.6 + 0.4*Math.sin(this._t*4.0);
    const light = this.crown.children.find(x => x.isLight);
    if (light) light.intensity = 0.7 + pulse;

    // billboard-ish toward camera
    if (camera) {
      const cam = new THREE.Vector3();
      camera.getWorldPosition(cam);
      const look = cam.clone(); look.y = this.crown.position.y;
      this.crown.lookAt(look);
    }
  },

  _walkAwayLogic(dt) {
    // Bots that bust walk away then later return for next match cycle
    const awaySpot = new THREE.Vector3(this.tableCenter.x + 3.8, 0, this.tableCenter.z + 2.8);

    for (const s of this.seats) {
      if (!s.busted) continue;

      // Only animate if flagged
      if (!s.walkAway) {
        s.walkAway = true;
        s.walkT = 0;
      }

      s.walkT += dt;

      const start = s.pos.clone();
      const end = awaySpot.clone().add(new THREE.Vector3((s.i-2)*0.4, 0, (s.i%2)*0.5));

      const t = clamp(s.walkT / 3.0, 0, 1);
      const e = easeOutCubic(t);

      // move the seat group (bot visuals would be inside seat.g in your bots module — still safe)
      s.g.position.set(
        THREE.MathUtils.lerp(start.x, end.x, e),
        0,
        THREE.MathUtils.lerp(start.z, end.z, e)
      );
    }
  },

  _resetSeatPositions() {
    // Put seat groups back to their original positions (for next tourney cycle)
    for (const s of this.seats) {
      s.g.position.set(s.pos.x, 0, s.pos.z);
      s.walkAway = false;
      s.walkT = 0;
    }
  },

  _activeSeatIndices() {
    return this.seats.filter(s => !s.busted && s.chips > 0);
  },

  _beginHand() {
    this._hand++;
    this._pot = 0;

    // clear crown between hands
    this._setCrown(-1);
    this.crown.visible = false;

    // all in hand unless busted
    for (const s of this.seats) {
      s.inHand = (!s.busted && s.chips > 0);
      // re-deal hole cards only for active players
      if (s.inHand) this._dealHole(s);
    }

    // ante + blinds
    const actives = this._activeSeatIndices();
    if (actives.length < 2) {
      // end tournament
      this._phase = "tourney_end";
      this._phaseT = 0;
      return;
    }

    for (const s of actives) {
      const pay = Math.min(s.chips, this.ante);
      s.chips -= pay;
      this._pot += pay;
    }

    const sb = (this._dealerIndex + 1) % this.seatCount;
    const bb = (this._dealerIndex + 2) % this.seatCount;

    const sbs = this.seats[sb];
    const bbs = this.seats[bb];

    if (!sbs.busted) { const pay = Math.min(sbs.chips, this.blindSmall); sbs.chips -= pay; this._pot += pay; }
    if (!bbs.busted) { const pay = Math.min(bbs.chips, this.blindBig);  bbs.chips -= pay; this._pot += pay; }

    // community cards
    this._dealNewCommunity();

    // rotate dealer chip
    this._updateDealerButton();

    // build pot visuals
    this._rebuildPotChips();
    this._refreshSeatChips();

    // turn starts left of big blind
    this._turnIndex = (bb + 1) % this.seatCount;
    this._updateTurnRing();

    this._phase = "betting";
    this._phaseT = 0;

    this._drawHud(
      "Skylark Live Table",
      `HAND ${this._hand}/${this.handTarget} • POT $${this._pot}`,
      `Dealer: BOT ${this._dealerIndex+1} • Action: BOT ${this._turnIndex+1}`
    );
  },

  _chooseAction(seat) {
    // light strategy / variety
    // 0 fold, 1 call, 2 raise
    const roll = Math.random();

    // If low chips, more fold/call
    const pressure = clamp(1 - seat.chips / 20000, 0, 1);

    let foldP = 0.18 + pressure * 0.15;
    let raiseP = 0.28 - pressure * 0.12;
    let callP = 1 - foldP - raiseP;

    if (seat.chips < 400) { raiseP *= 0.35; foldP += 0.10; callP = 1 - foldP - raiseP; }

    if (roll < foldP) return "FOLD";
    if (roll < foldP + callP) return "CALL";
    return "RAISE";
  },

  _betAmount(seat) {
    // raise size range
    const base = randInt(150, 900);
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

  _bettingStep() {
    const s = this.seats[this._turnIndex];
    if (!s || s.busted || !s.inHand) { this._advanceTurn(); return; }

    const action = this._chooseAction(s);

    if (action === "FOLD") {
      s.inHand = false;
    } else if (action === "CALL") {
      const call = Math.min(s.chips, randInt(80, 240));
      s.chips -= call; this._pot += call;
    } else { // RAISE
      const raise = this._betAmount(s);
      s.chips -= raise; this._pot += raise;
    }

    this._rebuildPotChips();
    this._refreshSeatChips();

    this._drawHud(
      "Skylark Live Table",
      `HAND ${this._hand}/${this.handTarget} • POT $${this._pot}`,
      `BOT ${this._turnIndex+1} ${action}${action==="RAISE" ? "!" : ""}`
    );

    this._advanceTurn();
  },

  _resolveHand() {
    // Pick winner among players still in hand, bias to those with more chips / random
    const alive = this.seats.filter(s => s.inHand && !s.busted);
    const candidates = alive.length ? alive : this.seats.filter(s => !s.busted);

    const winner = candidates[Math.floor(Math.random()*candidates.length)];
    winner.chips += this._pot;

    // Show crown to ONLY the winner, glow, rise
    this._setCrown(winner.i);
    this.crown.visible = true;

    // Bust handling: if chips 0 => bust and walk away
    for (const s of this.seats) {
      if (!s.busted && s.chips <= 0) {
        s.busted = true;
        s.inHand = false;
      }
    }

    const winHandName = this._handNameSimple();

    this._refreshSeatChips();
    this._rebuildPotChips();

    this._phase = "win_show";
    this._phaseT = 0;

    this._drawHud(
      "Skylark Live Table",
      `WINNER: BOT ${winner.i+1} • +$${this._pot}`,
      `${winHandName}`
    );

    // reset pot
    this._pot = 0;
  },

  update(dt, camera) {
    if (!this.group) return;
    this._t += dt;
    this._phaseT += dt;

    // billboard name tags + hole cards to face camera
    if (camera) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      for (const s of this.seats) {
        if (s.nameTag) {
          const look = camPos.clone();
          look.y = s.nameTag.getWorldPosition(new THREE.Vector3()).y;
          s.nameTag.lookAt(look);
        }
        // hole cards face camera (hover over head)
        for (const c of s.handCards) {
          const look = camPos.clone();
          look.y = c.getWorldPosition(new THREE.Vector3()).y;
          c.lookAt(look);
        }
      }

      // HUD face camera gently (hover over table)
      if (this.hud) {
        const look = camPos.clone();
        look.y = this.hud.position.y;
        this.hud.lookAt(look);
      }
    }

    // Crown update
    this._updateCrown(dt, camera);

    // Phase machine
    if (this._phase === "prehand") {
      if (this._phaseT > 0.6) {
        this._phaseT = 0;
        this._beginHand();
      }
    }

    if (this._phase === "betting") {
      // do betting steps over time
      if (this._phaseT > 0.85) {
        this._phaseT = 0;

        // run a few actions then resolve
        // End when only one remains in hand OR enough actions have happened
        const inHandCount = this.seats.filter(s=>s.inHand && !s.busted).length;
        if (inHandCount <= 1 || this._t % 9.5 < 0.9) {
          this._resolveHand();
        } else {
          this._bettingStep();
        }
      }
    }

    if (this._phase === "win_show") {
      // show crown for ~10 seconds, then next hand
      if (this._phaseT > 10.0) {
        this._phaseT = 0;

        // Dealer advances
        this._dealerIndex = (this._dealerIndex + 1) % this.seatCount;

        // If we hit target hands, determine tournament end
        if (this._hand >= this.handTarget) {
          this._phase = "tourney_end";
          this._phaseT = 0;
        } else {
          // hide crown before next hand
          this.crown.visible = false;
          this._phase = "prehand";
        }
      }
    }

    if (this._phase === "tourney_end") {
      // pick top3 by chips
      const ranked = [...this.seats].sort((a,b)=>b.chips-a.chips);
      const top = ranked.slice(0,3);

      // crown stays with #1 for a bit then everyone resets
      if (!this.crown.visible) {
        this._setCrown(top[0].i);
        this.crown.visible = true;
      }

      this._drawHud(
        "BOSS TOURNAMENT • FINAL",
        `#1 BOT ${top[0].i+1} • $${top[0].chips}`,
        `#2 BOT ${top[1].i+1} • $${top[1].chips}    #3 BOT ${top[2].i+1} • $${top[2].chips}`
      );

      // losers walk away
      this._walkAwayLogic(dt);

      // after 20s reset tournament cycle
      if (this._phaseT > 20.0) {
        this.crown.visible = false;
        this._resetSeatPositions();
        this._beginTournament();
      }
    }
  },
};
