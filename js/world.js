// js/world.js — VIP Room World Builder + Neon Leaderboard (8.2)
// - Big neon leaderboard in back (Top 3 of 10 hands + last winner + hand rank + pot)
// - Glow picture frames placeholders
// - Safe hook to PokerSimulation (no crashes if missing)
// - DOES NOT mess with controller rig (main.js handles movement)

import * as THREE from "./three.js";

export const World = {
  scene: null,
  player: null,

  // tournament data
  summary: {
    handCount: 0,
    maxHands: 10,
    wins: {},
    top3: [],
    lastWinner: "—",
    lastHandName: "—",
    lastPot: 0,
  },

  // objects
  roomGroup: null,
  boardGroup: null,
  boardCanvas: null,
  boardCtx: null,
  boardTex: null,
  glowPieces: [],
  frames: [],

  // poker sim
  PokerSimulation: null,

  _t: 0,
  _pulse: 0,

  async build(scene, playerGroup) {
    this.scene = scene;
    this.player = playerGroup;

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = "VIPWorld";
    this.scene.add(this.roomGroup);

    this.buildRoomShell();
    this.buildGlowFrames();
    this.buildLeaderboardWall();

    await this.tryStartPokerSim();

    return this.roomGroup;
  },

  update(dt, camera) {
    this._t += dt;
    this._pulse += dt;

    // pulse glow
    const pulse = 1.05 + Math.sin(this._pulse * 1.8) * 0.22;
    for (const p of this.glowPieces) {
      if (p?.material?.emissiveIntensity != null) p.material.emissiveIntensity = pulse;
    }

    // render leaderboard 5fps
    if (this._t > 0.20) {
      this._t = 0;

      // poll summary if available
      if (this.PokerSimulation?.getSummary) {
        try {
          const s = this.PokerSimulation.getSummary();
          if (s) this.summary = { ...this.summary, ...s };
        } catch {}
      }
      this.drawBoard();
    }

    // update sim
    if (this.PokerSimulation?.update) {
      try { this.PokerSimulation.update(dt, camera); } catch {}
    }
  },

  matte(color, rough=0.95) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
  },

  neon(color, intensity=1.15) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: intensity,
    });
  },

  buildRoomShell() {
    const g = new THREE.Group();
    g.name = "RoomShell";
    this.roomGroup.add(g);

    const W = 30, D = 30, H = 6;

    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), this.matte(0x1b1f28, 0.96));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    g.add(floor);

    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), this.matte(0x090a0f, 0.98));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    g.add(ceil);

    // walls
    const wallMat = this.matte(0x0f121a, 0.92);
    const t = 0.35;

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), wallMat);
    wallN.position.set(0, H/2, -D/2);
    g.add(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), wallMat);
    wallS.position.set(0, H/2, D/2);
    g.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), wallMat);
    wallE.position.set(W/2, H/2, 0);
    g.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), wallMat);
    wallW.position.set(-W/2, H/2, 0);
    g.add(wallW);

    // neon trim strips
    const trim = this.neon(0x00ffaa, 0.95);
    const trimH = 0.08;

    const tn = new THREE.Mesh(new THREE.BoxGeometry(W-0.2, trimH, 0.08), trim);
    tn.position.set(0, H-0.35, -D/2+0.2);
    g.add(tn);

    const ts = new THREE.Mesh(new THREE.BoxGeometry(W-0.2, trimH, 0.08), trim);
    ts.position.set(0, H-0.35, D/2-0.2);
    g.add(ts);

    const te = new THREE.Mesh(new THREE.BoxGeometry(0.08, trimH, D-0.2), trim);
    te.position.set(W/2-0.2, H-0.35, 0);
    g.add(te);

    const tw = new THREE.Mesh(new THREE.BoxGeometry(0.08, trimH, D-0.2), trim);
    tw.position.set(-W/2+0.2, H-0.35, 0);
    g.add(tw);

    this.glowPieces.push(tn, ts, te, tw);

    // extra lights so it never goes black
    const a = new THREE.PointLight(0x66aaff, 0.65, 65);
    a.position.set(-10, 4.2, 10);
    g.add(a);

    const b = new THREE.PointLight(0x00ffaa, 0.55, 65);
    b.position.set(10, 4.2, -10);
    g.add(b);

    const c = new THREE.PointLight(0xffffff, 0.18, 30);
    c.position.set(0, 2.2, 0);
    g.add(c);
  },

  buildGlowFrames() {
    // picture mount frames (no textures yet)
    const mounts = [
      { x:-14.2, y:2.8, z:-6.5, ry: Math.PI/2 },
      { x:-14.2, y:2.8, z: 6.5, ry: Math.PI/2 },
      { x: 14.2, y:2.8, z:-6.5, ry:-Math.PI/2 },
      { x: 14.2, y:2.8, z: 6.5, ry:-Math.PI/2 },
    ];

    for (let i=0;i<mounts.length;i++){
      const p = mounts[i];
      const group = new THREE.Group();
      group.position.set(p.x,p.y,p.z);
      group.rotation.y = p.ry;

      const glow = new THREE.Mesh(new THREE.BoxGeometry(3.35, 2.25, 0.08), this.neon(0x00ffaa, 0.95));
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.0), this.matte(0x0b0c10, 0.95));
      plate.position.z = 0.03;

      group.add(glow, plate);
      this.roomGroup.add(group);

      this.frames.push(group);
      this.glowPieces.push(glow);
    }
  },

  buildLeaderboardWall() {
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "NeonLeaderboard";
    this.roomGroup.add(this.boardGroup);

    // BACK WALL center
    this.boardGroup.position.set(0, 2.95, -13.8);

    // canvas
    this.boardCanvas = document.createElement("canvas");
    this.boardCanvas.width = 1024;
    this.boardCanvas.height = 512;
    this.boardCtx = this.boardCanvas.getContext("2d");
    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTex.colorSpace = THREE.SRGBColorSpace;

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(9.0, 4.5),
      new THREE.MeshStandardMaterial({ map: this.boardTex, roughness: 0.6, metalness: 0.1, emissive: 0x000000, emissiveIntensity: 0.25 })
    );
    panel.name = "BoardPanel";
    this.boardGroup.add(panel);

    // neon frame
    const frameMat = this.neon(0xff0055, 1.15);
    const top = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 0.12), frameMat);
    top.position.set(0, 2.55, 0.03);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 0.12), frameMat);
    bot.position.set(0,-2.55, 0.03);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.15, 0.12), frameMat);
    left.position.set(-4.8,0, 0.03);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.15, 0.12), frameMat);
    right.position.set( 4.8,0, 0.03);

    this.boardGroup.add(top, bot, left, right);
    this.glowPieces.push(top, bot, left, right);

    this.drawBoard();
  },

  drawBoard() {
    const ctx = this.boardCtx;
    if (!ctx) return;

    const W = 1024, H = 512;
    ctx.clearRect(0,0,W,H);

    // background
    ctx.fillStyle = "rgba(6,7,12,0.98)";
    ctx.fillRect(0,0,W,H);

    // grid
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#00ffaa";
    for (let x=0; x<W; x+=64){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=64){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // title
    ctx.fillStyle = "#ff3c78";
    ctx.font = "900 56px system-ui";
    ctx.fillText("BOSS TOURNAMENT", 48, 78);

    ctx.fillStyle = "#00ffaa";
    ctx.font = "900 32px system-ui";
    ctx.fillText(`Best of ${this.summary.maxHands} hands — Top 3`, 48, 120);

    // divider
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#00ffaa";
    ctx.fillRect(48, 140, W-96, 4);
    ctx.globalAlpha = 1;

    // top3
    const top3 = (this.summary.top3 && this.summary.top3.length)
      ? this.summary.top3
      : Object.entries(this.summary.wins||{}).sort((a,b)=>(b[1]-a[1])||a[0].localeCompare(b[0])).slice(0,3);

    const rows = top3.length ? top3 : [["—",0],["—",0],["—",0]];
    const colors = ["#ffd166","#c0c0c0","#cd7f32"];

    ctx.font = "900 46px system-ui";
    for (let i=0;i<3;i++){
      ctx.fillStyle = colors[i];
      ctx.fillText(`${i+1}. ${rows[i][0]}`, 64, 218 + i*76);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${rows[i][1]} wins`, 740, 218 + i*76);
    }

    // footer status (last winner + rank + pot)
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(48, 430, W-96, 2);
    ctx.globalAlpha = 1;

    ctx.font = "900 30px system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Hand: ${this.summary.handCount}/${this.summary.maxHands}`, 48, 476);

    ctx.fillStyle = "#00ffaa";
    ctx.fillText(`Last: ${this.summary.lastWinner}`, 290, 476);

    ctx.fillStyle = "#ff3c78";
    ctx.fillText(`${this.summary.lastHandName}`, 640, 476);

    ctx.fillStyle = "#ffd166";
    ctx.fillText(`Pot: $${this.summary.lastPot||0}`, 820, 476);

    this.boardTex.needsUpdate = true;
  },

  async tryStartPokerSim() {
    try {
      const mod = await import("./poker_simulation.js");
      const sim = mod.PokerSimulation || mod.default;
      if (!sim?.build) return;

      // Place sim at boss table center (matches your boss_table.js)
      sim.build(this.scene, { center: new THREE.Vector3(0,0,-6.5) });

      // Listen for hand_end updates for leaderboard
      if (sim.on) {
        sim.on("hand_end", (payload) => {
          this.summary.handCount = payload.handNumber ?? this.summary.handCount;
          this.summary.maxHands = payload.maxHands ?? this.summary.maxHands;
          this.summary.lastWinner = payload.winnerName ?? this.summary.lastWinner;
          this.summary.lastHandName = payload.handName ?? this.summary.lastHandName;
          this.summary.lastPot = payload.pot ?? this.summary.lastPot;
          this.summary.wins = payload.wins ? { ...payload.wins } : this.summary.wins;

          const entries = Object.entries(this.summary.wins||{}).sort((a,b)=>(b[1]-a[1])||a[0].localeCompare(b[0]));
          this.summary.top3 = entries.slice(0,3);
        });
      }

      this.PokerSimulation = sim;
    } catch (e) {
      // optional — world must never crash if sim missing
      console.warn("[World] PokerSimulation not started", e);
    }
  },
};
