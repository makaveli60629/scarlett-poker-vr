// js/poker_simulation.js — 8.2.6 Frozen-Proof + Cached Cards + Simple Hand Loop
import * as THREE from "./three.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function randInt(n){ return Math.floor(Math.random()*n); }

function makeCardTexture(rank, suit) {
  // smaller canvas = much faster on Quest browser
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 384;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(248,248,252,0.98)";
  ctx.fillRect(0,0,256,384);

  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.strokeRect(12,12,256-24,384-24);

  const red = (suit==="♥" || suit==="♦");
  const col = red ? "rgba(220,40,65,0.95)" : "rgba(30,30,34,0.95)";

  ctx.fillStyle = col;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "900 64px system-ui";
  ctx.fillText(rank, 26, 20);
  ctx.font = "900 58px system-ui";
  ctx.fillText(suit, 30, 88);

  // mirrored bottom
  ctx.save();
  ctx.translate(256,384);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = col;
  ctx.font = "900 64px system-ui";
  ctx.fillText(rank, 26, 20);
  ctx.font = "900 58px system-ui";
  ctx.fillText(suit, 30, 88);
  ctx.restore();

  // big suit center
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = col;
  ctx.font = "900 128px system-ui";
  ctx.fillText(suit, 128, 195);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeLabel(text, color = "rgba(0,255,170,0.95)") {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "rgba(8,10,16,0.68)";
  ctx.fillRect(0,0,512,256);

  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,255,170,0.55)";
  ctx.strokeRect(18,18,476,220);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = "900 72px system-ui";
  ctx.fillText(text, 256, 132);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
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
  return new THREE.Mesh(g, m);
}

function buildBotBody() {
  const bot = new THREE.Group();
  bot.name = "BotBody";

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.95 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.28, 6, 12), bodyMat);
  torso.position.y = 0.72;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), headMat);
  head.position.y = 1.02;

  bot.add(torso, head);
  return bot;
}

export const PokerSimulation = {
  group: null,

  seatCount: 5,
  startingChips: 20000,

  chairRadius: 3.05,
  tableEdgeRadius: 2.18,
  tableY: 1.02,

  tableCenter: new THREE.Vector3(0, 1.02, -6.5),

  seats: [],
  community: [],

  // Cached textures (52)
  deckTextures: [],
  deckIndex: 0,

  // Hand loop state
  phase: "idle",
  phaseT: 0,

  build(parent, centerVec3) {
    this.group = new THREE.Group();
    this.group.name = "PokerSimulation";
    parent.add(this.group);

    if (centerVec3) this.tableCenter.copy(centerVec3);

    // Build cached deck textures once
    this.deckTextures = [];
    for (const s of SUITS) for (const r of RANKS) this.deckTextures.push(makeCardTexture(r, s));
    this.deckIndex = 0;

    this.seats = [];
    this.community = [];

    // Seats & bots
    for (let i=0;i<this.seatCount;i++){
      const ang = (i/this.seatCount) * Math.PI * 2;

      const bx = this.tableCenter.x + Math.cos(ang) * this.chairRadius;
      const bz = this.tableCenter.z + Math.sin(ang) * this.chairRadius;

      const ex = this.tableCenter.x + Math.cos(ang) * this.tableEdgeRadius;
      const ez = this.tableCenter.z + Math.sin(ang) * this.tableEdgeRadius;

      const toCenter = new THREE.Vector3(this.tableCenter.x - bx, 0, this.tableCenter.z - bz).normalize();
      const leftVec  = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), toCenter).normalize();

      const seat = {
        i,
        chips: this.startingChips,
        bot: buildBotBody(),
        nameTag: null,
        moneyTag: null,
        chipGroup: new THREE.Group(),
        holeCards: [],
      };

      // Bot: pull toward table and lower slightly (seated feel)
      seat.bot.position.set(
        bx + toCenter.x * 0.18,
        -0.08,
        bz + toCenter.z * 0.18
      );
      seat.bot.lookAt(new THREE.Vector3(this.tableCenter.x, 0.9, this.tableCenter.z));
      this.group.add(seat.bot);

      // Tags
      const name = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.31),
        new THREE.MeshBasicMaterial({ map: makeLabel(`BOT ${i+1}`), transparent:true, depthTest:false })
      );
      name.renderOrder = 999;
      name.position.set(0, 1.45, 0.10);
      seat.bot.add(name);
      seat.nameTag = name;

      const money = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.31),
        new THREE.MeshBasicMaterial({ map: makeLabel(`$${seat.chips}`, "rgba(255,255,255,0.95)"), transparent:true, depthTest:false })
      );
      money.renderOrder = 999;
      money.position.set(0, 1.15, 0.10);
      seat.bot.add(money);
      seat.moneyTag = money;

      // Chips ON TABLE (left)
      seat.chipGroup.position.set(
        ex + leftVec.x * 0.36,
        this.tableY + 0.02,
        ez + leftVec.z * 0.36
      );
      this.group.add(seat.chipGroup);

      // Hole cards ON TABLE (right)
      for (let c=0;c<2;c++){
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(0.26, 0.36),
          new THREE.MeshStandardMaterial({ map: this._drawCardTex(), roughness: 0.85 })
        );

        const rightVec = leftVec.clone().multiplyScalar(-1);
        card.position.set(
          ex + rightVec.x * (0.30 + c*0.18),
          this.tableY + 0.045,
          ez + rightVec.z * (0.30 + c*0.18)
        );

        card.rotation.x = -Math.PI/2;
        this.group.add(card);
        seat.holeCards.push(card);
      }

      this.seats.push(seat);
    }

    // Community cards hover (face camera in update)
    for (let i=0;i<5;i++){
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.44),
        new THREE.MeshStandardMaterial({ map: this._drawCardTex(), roughness: 0.85 })
      );
      card.position.set(this.tableCenter.x + (i-2)*0.52, this.tableY + 0.40, this.tableCenter.z + 0.15);
      this.group.add(card);
      this.community.push(card);
    }

    // Initial chips
    this._rebuildAllChips();

    // Start the loop
    this.phase = "deal";
    this.phaseT = 0;
  },

  _drawCardTex() {
    // simple shuffle draw
    this.deckIndex = (this.deckIndex + 1 + randInt(7)) % this.deckTextures.length;
    return this.deckTextures[this.deckIndex];
  },

  _rebuildAllChips() {
    for (const s of this.seats) {
      s.chipGroup.clear();

      // More “fluffed” stacks instead of one long stick
      const stackColors = [0x101010, 0xff3344, 0x00b7ff, 0x00ffaa];
      const stacks = 6;

      for (let st=0; st<stacks; st++){
        const color = stackColors[st % stackColors.length];
        const baseX = (st % 3) * 0.18 - 0.18;
        const baseZ = (st > 2 ? 0.18 : 0);

        const count = 8 + randInt(6);
        for (let k=0;k<count;k++){
          const chip = buildChip(color);
          chip.position.set(baseX + (Math.random()-0.5)*0.015, 0.014 + k*0.026, baseZ + (Math.random()-0.5)*0.015);
          chip.rotation.y = Math.random()*Math.PI;
          s.chipGroup.add(chip);
        }
      }
    }
  },

  _newHand() {
    // Update all card faces without creating new textures
    for (const s of this.seats) {
      for (const c of s.holeCards) c.material.map = this._drawCardTex();
      s.moneyTag.material.map = makeLabel(`$${s.chips}`, "rgba(255,255,255,0.95)");
      s.moneyTag.material.map.needsUpdate = true;
    }
    for (const c of this.community) c.material.map = this._drawCardTex();

    this._rebuildAllChips();
  },

  update(dt, camera) {
    try {
      // Simple hand loop so it never “just sits there”
      this.phaseT += dt;

      if (this.phase === "deal" && this.phaseT > 0.4) {
        this._newHand();
        this.phase = "flop";
        this.phaseT = 0;
      } else if (this.phase === "flop" && this.phaseT > 1.6) {
        // show first 3 community by lifting them slightly
        for (let i=0;i<3;i++) this.community[i].position.y = this.tableY + 0.48;
        this.phase = "turn";
        this.phaseT = 0;
      } else if (this.phase === "turn" && this.phaseT > 1.4) {
        this.community[3].position.y = this.tableY + 0.48;
        this.phase = "river";
        this.phaseT = 0;
      } else if (this.phase === "river" && this.phaseT > 1.4) {
        this.community[4].position.y = this.tableY + 0.48;
        this.phase = "winner";
        this.phaseT = 0;
      } else if (this.phase === "winner" && this.phaseT > 2.0) {
        // reset hover height
        for (let i=0;i<5;i++) this.community[i].position.y = this.tableY + 0.40;
        this.phase = "deal";
        this.phaseT = 0;
      }

      // Billboard tags & community to camera
      if (camera && camera.getWorldPosition) {
        const cam = new THREE.Vector3();
        camera.getWorldPosition(cam);

        for (const s of this.seats) {
          for (const tag of [s.nameTag, s.moneyTag]) {
            if (!tag) continue;
            const wp = new THREE.Vector3();
            tag.getWorldPosition(wp);
            const look = cam.clone();
            look.y = wp.y;
            tag.lookAt(look);
          }
        }

        for (const c of this.community) {
          const wp = new THREE.Vector3();
          c.getWorldPosition(wp);
          const look = cam.clone();
          look.y = wp.y;
          c.lookAt(look);
        }
      }
    } catch (e) {
      // IMPORTANT: prevents a single error from freezing the whole game
      console.warn("PokerSimulation.update guarded error:", e);
    }
  },
};
