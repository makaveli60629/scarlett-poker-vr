// js/world.js — VIP Room World Builder (8.2)
// GOALS:
// - Build a clean VIP room (no photo textures yet, elegant colors)
// - Add a BIG glowing Leaderboard Wall behind the table
// - Add glowing wall frames (future picture mounts)
// - Safely integrate poker_simulation WITHOUT crashing if exports change
// - Keep everything stable on GitHub Pages / Quest (no bare "three" imports)

import * as THREE from "./three.js";

export const World = {
  scene: null,
  player: null,

  // modules (loaded dynamically so export-name mismatches don't crash)
  _mods: {
    poker: null,
    vipRoom: null,
    bossTable: null,
    solidWalls: null,
    lightsPack: null,
  },

  // objects
  roomGroup: null,
  boardGroup: null,
  boardCanvas: null,
  boardCtx: null,
  boardTex: null,
  boardMesh: null,
  boardGlowStrips: [],
  wallFrames: [],

  // tournament tracking (fallback if poker sim doesn't provide)
  tournament: {
    handCount: 0,
    wins: {},           // botName -> wins
    lastWinner: "—",
    lastHandName: "—",
    lastPot: 0,
    top3: [],
  },

  // throttle
  _tBoard: 0,
  _tPulse: 0,

  // --- Helpers ---
  clamp(n, a, b) { return Math.max(a, Math.min(b, n)); },

  // Soft neon material
  neon(color = 0x00ffaa, intensity = 1.25) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: intensity,
    });
  },

  matte(color = 0x222222, roughness = 0.95) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.05,
    });
  },

  // --- Dynamic module loader (prevents "PokerSim export not found" crashes) ---
  async safeImport(path) {
    try {
      return await import(path);
    } catch (e) {
      console.warn(`[World] Optional module failed: ${path}`, e);
      return null;
    }
  },

  async build(scene, playerGroup) {
    this.scene = scene;
    this.player = playerGroup;

    // main container for world pieces
    this.roomGroup = new THREE.Group();
    this.roomGroup.name = "VIPRoomWorld";
    this.scene.add(this.roomGroup);

    // 1) Build base room (always)
    this.buildBaseRoom();

    // 2) Try to load and build your VIP room module (optional)
    await this.tryBuildVipRoomModule();

    // 3) Try to load and build your Boss Table module (optional)
    await this.tryBuildBossTableModule();

    // 4) Add the Leaderboard Wall (always)
    this.buildLeaderboardWall();

    // 5) Add glowing picture frames on walls (always)
    this.buildWallFrames();

    // 6) Try to hook poker simulation safely
    await this.tryHookPokerSimulation();

    return this.roomGroup;
  },

  update(dt, camera) {
    // pulse glow strips (subtle)
    this._tPulse += dt;
    const pulse = 1.1 + Math.sin(this._tPulse * 1.7) * 0.25;
    for (const s of this.boardGlowStrips) {
      if (s?.material) s.material.emissiveIntensity = pulse;
    }
    for (const f of this.wallFrames) {
      if (f?.userData?.glow && f.userData.glow.material) {
        f.userData.glow.material.emissiveIntensity = 0.9 + Math.sin(this._tPulse * 1.35) * 0.18;
      }
    }

    // update leaderboard at ~5 fps (cheap + stable)
    this._tBoard += dt;
    if (this._tBoard > 0.20) {
      this._tBoard = 0;
      this.refreshTournamentFromPokerIfPossible();
      this.renderLeaderboard();
    }
  },

  // ----------------------------
  // Base Room (stable, no textures)
  // ----------------------------
  buildBaseRoom() {
    const g = new THREE.Group();
    g.name = "BaseRoom";
    this.roomGroup.add(g);

    // Dimensions
    const W = 28;
    const D = 28;
    const H = 6;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      this.matte(0x1b1f28, 0.96)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "VIP_Floor";
    g.add(floor);

    // Subtle ring in floor (casino vibe)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5.6, 5.85, 96),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    ring.name = "FloorRing";
    g.add(ring);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      this.matte(0x0b0c10, 0.98)
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    ceil.name = "VIP_Ceiling";
    g.add(ceil);

    // Walls (simple box room)
    const wallMat = this.matte(0x0f121a, 0.92);
    const t = 0.35;

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), wallMat);
    wallN.position.set(0, H / 2, -D / 2);
    wallN.name = "WallN";
    g.add(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), wallMat);
    wallS.position.set(0, H / 2, D / 2);
    wallS.name = "WallS";
    g.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), wallMat);
    wallE.position.set(W / 2, H / 2, 0);
    wallE.name = "WallE";
    g.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), wallMat);
    wallW.position.set(-W / 2, H / 2, 0);
    wallW.name = "WallW";
    g.add(wallW);

    // Neon trim near ceiling
    const trimMat = this.neon(0x00ffaa, 0.95);
    const trimH = 0.08;

    const trimN = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, trimH, 0.08), trimMat);
    trimN.position.set(0, H - 0.35, -D / 2 + 0.2);
    g.add(trimN);

    const trimS = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, trimH, 0.08), trimMat);
    trimS.position.set(0, H - 0.35, D / 2 - 0.2);
    g.add(trimS);

    const trimE = new THREE.Mesh(new THREE.BoxGeometry(0.08, trimH, D - 0.2), trimMat);
    trimE.position.set(W / 2 - 0.2, H - 0.35, 0);
    g.add(trimE);

    const trimW = new THREE.Mesh(new THREE.BoxGeometry(0.08, trimH, D - 0.2), trimMat);
    trimW.position.set(-W / 2 + 0.2, H - 0.35, 0);
    g.add(trimW);

    // Extra room lights (help Quest)
    const a = new THREE.PointLight(0x66aaff, 0.55, 60);
    a.position.set(-8, 3.8, 8);
    g.add(a);

    const b = new THREE.PointLight(0x00ffaa, 0.45, 60);
    b.position.set(8, 3.8, -8);
    g.add(b);

    const c = new THREE.PointLight(0xffffff, 0.18, 30);
    c.position.set(0, 2.2, 0);
    g.add(c);
  },

  // ----------------------------
  // Optional modules
  // ----------------------------
  async tryBuildVipRoomModule() {
    const mod = await this.safeImport("./vip_room.js");
    if (!mod) return;

    // support multiple export styles
    const VipRoom = mod.VipRoom || mod.default || mod.vipRoom || null;
    if (!VipRoom?.build) return;

    try {
      this._mods.vipRoom = VipRoom;
      VipRoom.build(this.scene, this.player);
      console.log("[World] vip_room built");
    } catch (e) {
      console.warn("[World] vip_room build failed", e);
    }
  },

  async tryBuildBossTableModule() {
    const mod = await this.safeImport("./boss_table.js");
    if (!mod) return;

    const BossTable = mod.BossTable || mod.default || mod.bossTable || null;
    if (!BossTable?.build) return;

    try {
      this._mods.bossTable = BossTable;
      BossTable.build(this.scene);
      console.log("[World] boss_table built");
    } catch (e) {
      console.warn("[World] boss_table build failed", e);
    }
  },

  // ----------------------------
  // Leaderboard wall
  // ----------------------------
  buildLeaderboardWall() {
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "LeaderboardWall";
    this.roomGroup.add(this.boardGroup);

    // Place behind table, centered, facing the spawn/table
    // If your table is near z=-6.5, put board further back at z=-12.5
    this.boardGroup.position.set(0, 2.9, -12.5);
    this.boardGroup.rotation.y = 0;

    // Canvas texture
    const w = 1024;
    const h = 512;
    this.boardCanvas = document.createElement("canvas");
    this.boardCanvas.width = w;
    this.boardCanvas.height = h;
    this.boardCtx = this.boardCanvas.getContext("2d");

    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTex.colorSpace = THREE.SRGBColorSpace;

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 4.4),
      new THREE.MeshStandardMaterial({
        map: this.boardTex,
        roughness: 0.55,
        metalness: 0.10,
        emissive: 0x000000,
        emissiveIntensity: 0.25,
      })
    );
    panel.name = "LeaderboardPanel";
    this.boardMesh = panel;
    this.boardGroup.add(panel);

    // Backer (dark plate)
    const backer = new THREE.Mesh(
      new THREE.BoxGeometry(9.25, 4.85, 0.16),
      this.matte(0x07080c, 0.98)
    );
    backer.position.z = -0.10;
    backer.name = "LeaderboardBacker";
    this.boardGroup.add(backer);

    // Neon frame
    const frameMat = this.neon(0xff0055, 1.15);
    const top = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 0.12), frameMat);
    top.position.set(0, 2.45, 0.03);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 0.12), frameMat);
    bot.position.set(0, -2.45, 0.03);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.95, 0.12), frameMat);
    left.position.set(-4.7, 0, 0.03);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.95, 0.12), frameMat);
    right.position.set(4.7, 0, 0.03);

    this.boardGroup.add(top, bot, left, right);
    this.boardGlowStrips.push(top, bot, left, right);

    // Two spotlights washing board
    const s1 = new THREE.SpotLight(0x00ffaa, 0.55, 28, Math.PI / 8, 0.55, 1.0);
    s1.position.set(-5, 5.1, -9.5);
    s1.target = this.boardGroup;
    this.scene.add(s1);
    this.scene.add(s1.target);

    const s2 = new THREE.SpotLight(0xff0055, 0.45, 28, Math.PI / 8, 0.55, 1.0);
    s2.position.set(5, 5.1, -9.5);
    s2.target = this.boardGroup;
    this.scene.add(s2);
    this.scene.add(s2.target);

    // first draw
    this.renderLeaderboard();
  },

  renderLeaderboard() {
    const ctx = this.boardCtx;
    if (!ctx) return;

    const W = this.boardCanvas.width;
    const H = this.boardCanvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#06070c";
    ctx.fillRect(0, 0, W, H);

    // subtle grid
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#00ffaa";
    for (let x = 0; x < W; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Title
    ctx.font = "bold 54px Arial";
    ctx.fillStyle = "#ff0055";
    ctx.fillText("BOSS TOURNAMENT", 44, 78);

    ctx.font = "bold 34px Arial";
    ctx.fillStyle = "#00ffaa";
    ctx.fillText("Best of 10 Hands — Top 3", 44, 120);

    // Divider
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#00ffaa";
    ctx.fillRect(44, 140, W - 88, 4);
    ctx.globalAlpha = 1;

    const t = this.tournament;

    // Top 3 list
    ctx.font = "bold 44px Arial";
    const rows = t.top3.length ? t.top3 : [["—", 0], ["—", 0], ["—", 0]];

    const colors = ["#ffd166", "#c0c0c0", "#cd7f32"];
    for (let i = 0; i < 3; i++) {
      const name = rows[i]?.[0] ?? "—";
      const wins = rows[i]?.[1] ?? 0;

      ctx.fillStyle = colors[i];
      ctx.fillText(`${i + 1}. ${name}`, 60, 210 + i * 74);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${wins} wins`, 720, 210 + i * 74);
    }

    // Status bar
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(44, 430, W - 88, 2);
    ctx.globalAlpha = 1;

    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Hand: ${t.handCount}/10`, 44, 475);

    ctx.fillStyle = "#00ffaa";
    ctx.fillText(`Last Winner: ${t.lastWinner}`, 290, 475);

    ctx.fillStyle = "#ff0055";
    ctx.fillText(`${t.lastHandName}`, 650, 475);

    // push texture update
    if (this.boardTex) this.boardTex.needsUpdate = true;
  },

  buildWallFrames() {
    // 4 frames: two on each side wall
    // These are "mount points" for future pictures/textures.
    const framePositions = [
      { x: -13.7, y: 2.8, z: -6.5, rotY: Math.PI / 2 },
      { x: -13.7, y: 2.8, z:  6.5, rotY: Math.PI / 2 },
      { x:  13.7, y: 2.8, z: -6.5, rotY: -Math.PI / 2 },
      { x:  13.7, y: 2.8, z:  6.5, rotY: -Math.PI / 2 },
    ];

    for (let i = 0; i < framePositions.length; i++) {
      const p = framePositions[i];
      const frame = new THREE.Group();
      frame.name = `WallFrame_${i}`;
      frame.position.set(p.x, p.y, p.z);
      frame.rotation.y = p.rotY;

      // plate (future image plane)
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1, 2.0),
        this.matte(0x0b0c10, 0.95)
      );
      plate.position.z = 0.02;
      plate.name = "FramePlate";

      // border glow
      const border = new THREE.Mesh(
        new THREE.RingGeometry(1.75, 1.84, 4),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      border.rotation.z = Math.PI / 4;
      border.position.z = 0.03;

      // neon edge bars
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(3.28, 2.18, 0.08),
        this.neon(0x00ffaa, 0.95)
      );
      glow.position.z = 0.00;
      glow.name = "FrameGlow";

      frame.add(glow, plate, border);
      frame.userData.glow = glow;

      this.roomGroup.add(frame);
      this.wallFrames.push(frame);
    }
  },

  // ----------------------------
  // Poker simulation safe hook
  // ----------------------------
  async tryHookPokerSimulation() {
    const mod = await this.safeImport("./poker_simulation.js");
    if (!mod) return;

    // Accept multiple export styles:
    // - export const PokerSimulation = ...
    // - export const pokerSim = ...
    // - export default ...
    // - export function createPokerSim()
    const candidate =
      mod.PokerSim ||
      mod.PokerSimulation ||
      mod.pokerSim ||
      mod.default ||
      null;

    // Store module and try to connect
    this._mods.poker = candidate || mod;

    // If it has an event system, subscribe
    const sub = candidate?.on || candidate?.subscribe || mod?.on || mod?.subscribe || null;
    if (typeof sub === "function") {
      try {
        sub.call(candidate, "hand_end", (payload) => this.onHandEnd(payload));
        sub.call(candidate, "winner", (payload) => this.onHandEnd(payload));
        console.log("[World] PokerSim subscribed");
      } catch (e) {
        console.warn("[World] PokerSim subscribe failed", e);
      }
    }

    // If it exposes a state getter, we’ll poll it in refreshTournamentFromPokerIfPossible()
    console.log("[World] PokerSim hooked (safe mode).");
  },

  onHandEnd(payload) {
    // payload might look like:
    // { handNumber, winnerName, handName, pot }
    if (!payload) return;

    const winner = payload.winnerName || payload.winner || payload.name || "—";
    const handName = payload.handName || payload.rankName || payload.bestHand || "WIN";
    const pot = payload.pot || payload.potSize || 0;
    const hn = payload.handNumber || payload.hand || null;

    if (hn != null) this.tournament.handCount = hn;

    this.tournament.lastWinner = winner;
    this.tournament.lastHandName = handName;
    this.tournament.lastPot = pot;

    this.tournament.wins[winner] = (this.tournament.wins[winner] || 0) + 1;

    this.computeTop3();
  },

  refreshTournamentFromPokerIfPossible() {
    // Poll for a summary if available
    const p = this._mods.poker;
    if (!p) return;

    const getter =
      p.getSummary || p.getState || p.summary || p.state || null;

    if (typeof getter === "function") {
      try {
        const s = getter.call(p);
        if (!s) return;

        // Try common shapes
        if (typeof s.handCount === "number") this.tournament.handCount = s.handCount;
        if (typeof s.handNumber === "number") this.tournament.handCount = s.handNumber;

        const w = s.lastWinner || s.winnerName || s.winner || null;
        if (w) this.tournament.lastWinner = w;

        const hn = s.lastHandName || s.handName || s.bestHandName || s.rankName || null;
        if (hn) this.tournament.lastHandName = hn;

        // wins map
        if (s.wins && typeof s.wins === "object") {
          this.tournament.wins = { ...s.wins };
        }

        this.computeTop3();
      } catch (e) {
        // silent: polling must never crash the frame
      }
    }
  },

  computeTop3() {
    const entries = Object.entries(this.tournament.wins || {});
    entries.sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
    this.tournament.top3 = entries.slice(0, 3);
  },
};
