// js/poker_simulation.js — Boss Table Poker Simulation (8.2.5)
// FIX:
// - Bots are now REAL visible bodies (not just tags)
// - Seat/chair alignment matches BossTable chair ring
// - Chips sit ON TABLE on player's LEFT
// - Hole cards sit ON TABLE on player's RIGHT
// - Tags hover above bot head (no overlap)
// - Community cards hover + face camera
// - No dealer object (nothing in center besides pot chips)

import * as THREE from "./three.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

function choice(a){ return a[Math.floor(Math.random()*a.length)]; }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

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
  ctx.font = "900 112px system-ui";
  ctx.fillText(rank, 52, 50);
  ctx.font = "900 108px system-ui";
  ctx.fillText(suit, 62, 175);

  ctx.save();
  ctx.translate(512,768);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = col;
  ctx.font = "900 112px system-ui";
  ctx.fillText(rank, 52, 50);
  ctx.font = "900 108px system-ui";
  ctx.fillText(suit, 62, 175);
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

function makeLabel(text, color = "rgba(0,255,170,0.95)") {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(8,10,16,0.72)";
  ctx.fillRect(0,0,512,256);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,255,170,0.55)";
  ctx.strokeRect(18,18,476,220);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,60,120,0.40)";
  ctx.strokeRect(30,30,452,196);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = "900 74px system-ui";
  ctx.fillText(text, 256, 130);

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

function buildBotBody() {
  const bot = new THREE.Group();
  bot.name = "BotBody";

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.95 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.28, 6, 12), bodyMat);
  torso.position.y = 0.78;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), headMat);
  head.position.y = 1.10;

  bot.add(torso, head);
  return bot;
}

export const PokerSimulation = {
  group: null,
  tableCenter: new THREE.Vector3(0, 1.02, -6.5),

  seatCount: 5,
  startingChips: 20000,

  chairRadius: 3.05,   // MUST match BossTable chairRadius
  tableEdgeRadius: 2.15, // where chips/cards sit on table edge

  tableY: 1.02,

  seats: [],
  community: [],

  build(parent, centerVec3) {
    this.group = new THREE.Group();
    this.group.name = "PokerSimulation";
    parent.add(this.group);

    if (centerVec3) this.tableCenter.copy(centerVec3);

    this.seats = [];

    // Build seats + bots + anchors
    for (let i=0;i<this.seatCount;i++){
      const ang = (i/this.seatCount) * Math.PI * 2;

      // Chair/bot position
      const bx = this.tableCenter.x + Math.cos(ang) * this.chairRadius;
      const bz = this.tableCenter.z + Math.sin(ang) * this.chairRadius;

      // Table edge position (for chips/cards)
      const ex = this.tableCenter.x + Math.cos(ang) * this.tableEdgeRadius;
      const ez = this.tableCenter.z + Math.sin(ang) * this.tableEdgeRadius;

      // Direction toward center
      const toCenter = new THREE.Vector3(this.tableCenter.x - bx, 0, this.tableCenter.z - bz).normalize();
      const leftVec  = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), toCenter).normalize(); // left of player

      const seat = {
        i,
        chips: this.startingChips,
        inHand: true,
        busted: false,

        bot: buildBotBody(),
        nameTag: null,
        moneyTag: null,

        chipGroup: new THREE.Group(),
        holeCards: [],
      };

      // Place bot in chair, face center
      seat.bot.position.set(bx, 0, bz);
      seat.bot.lookAt(new THREE.Vector3(this.tableCenter.x, 0.9, this.tableCenter.z));
      this.group.add(seat.bot);

      // Name tag above head
      const name = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.31),
        new THREE.MeshBasicMaterial({ map: makeLabel(`BOT ${i+1}`), transparent:true, depthTest:false })
      );
      name.renderOrder = 999;
      name.position.set(0, 1.55, 0.10);
      seat.bot.add(name);
      seat.nameTag = name;

      // Money tag below name
      const money = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.31),
        new THREE.MeshBasicMaterial({ map: makeLabel(`$${seat.chips}`, "rgba(255,255,255,0.95)"), transparent:true, depthTest:false })
      );
      money.renderOrder = 999;
      money.position.set(0, 1.22, 0.10);
      seat.bot.add(money);
      seat.moneyTag = money;

      // Chips ON TABLE, left side of player (near edge)
      seat.chipGroup.position.set(
        ex + leftVec.x * 0.35,
        this.tableY + 0.02,
        ez + leftVec.z * 0.35
      );
      this.group.add(seat.chipGroup);

      // Hole cards ON TABLE, right side of player (opposite leftVec)
      for (let c=0;c<2;c++){
        const r = choice(RANKS);
        const s = choice(SUITS);
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(0.26, 0.36),
          new THREE.MeshStandardMaterial({ map: makeCardTexture(r,s), roughness: 0.85 })
        );

        const rightVec = leftVec.clone().multiplyScalar(-1);
        card.position.set(
          ex + rightVec.x * (0.30 + c*0.17),
          this.tableY + 0.045,
          ez + rightVec.z * (0.30 + c*0.17)
        );

        // face outward a bit
        card.lookAt(new THREE.Vector3(
          card.position.x + toCenter.x,
          card.position.y,
          card.position.z + toCenter.z
        ));
        card.rotation.x = -Math.PI/2; // lay flat-ish
        this.group.add(card);
        seat.holeCards.push(card);
      }

      this.seats.push(seat);
    }

    // Community cards hover in center, face camera in update()
    this.community = [];
    for (let i=0;i<5;i++){
      const r = choice(RANKS);
      const s = choice(SUITS);
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.44),
        new THREE.MeshStandardMaterial({ map: makeCardTexture(r,s), roughness: 0.85 })
      );
      card.position.set(this.tableCenter.x + (i-2)*0.48, this.tableY + 0.38, this.tableCenter.z + 0.25);
      this.group.add(card);
      this.community.push(card);
    }

    // chips initial
    this._rebuildAllChips();
  },

  _rebuildAllChips() {
    for (const s of this.seats) {
      while (s.chipGroup.children.length) s.chipGroup.remove(s.chipGroup.children[0]);

      // simple stacks (we can do denoms later)
      const stacks = 4;
      for (let st=0; st<stacks; st++){
        const baseX = (st%2)*0.18 - 0.09;
        const baseZ = (st>1 ? 0.18 : 0);

        const color = [0x101010, 0xff3344, 0x00b7ff, 0x00ffaa][st];

        const count = 10;
        for (let k=0;k<count;k++){
          const chip = buildChip(color);
          chip.position.set(baseX + (Math.random()-0.5)*0.01, 0.014 + k*0.026, baseZ + (Math.random()-0.5)*0.01);
          chip.rotation.y = Math.random()*Math.PI;
          s.chipGroup.add(chip);
        }
      }
    }
  },

  update(dt, camera) {
    // Billboard name tags to camera (don’t tilt weird)
    if (camera) {
      const cam = new THREE.Vector3();
      camera.getWorldPosition(cam);

      for (const s of this.seats) {
        for (const tag of [s.nameTag, s.moneyTag]) {
          if (!tag) continue;
          const wp = new THREE.Vector3();
          tag.getWorldPosition(wp);
          const look = cam.clone();
          look.y = wp.y; // keep level
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
  },
};
