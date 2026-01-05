// js/world.js — VIP Room + Leaderboard + Poker Sim Host (8.2)
// Safe, self-contained build. No textures required.
// Expects ./three.js to exist (your project already uses it in boss_table.js).

import * as THREE from "./three.js";
import { PokerSim } from "./poker_simulation.js";

export const World = {
  _built: false,
  _scene: null,
  _rig: null,
  _camera: null,

  floor: null,
  room: null,

  // HUD boards
  boardAction: null,
  boardLeaderboard: null,

  // internal canvases
  _actionCanvas: null,
  _actionCtx: null,
  _actionTex: null,

  _leaderCanvas: null,
  _leaderCtx: null,
  _leaderTex: null,

  // lighting
  _lights: [],

  async build(scene, rig, camera) {
    this._scene = scene;
    this._rig = rig;
    this._camera = camera || null;

    // --- Floor (collidable / ray target) ---
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f2a,
      roughness: 0.9,
      metalness: 0.05,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "WorldFloor";
    scene.add(floor);
    this.floor = floor;

    // --- Room shell (simple, elegant) ---
    this.room = new THREE.Group();
    this.room.name = "VIPRoomShell";
    scene.add(this.room);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.95,
      metalness: 0.05,
    });

    // 4 solid walls
    const wallH = 5;
    const wallT = 0.4;
    const size = 26;

    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.name = "SolidWall";
      this.room.add(m);
      return m;
    };

    mkWall(size, wallH, wallT, 0, wallH / 2, -size / 2); // back
    mkWall(size, wallH, wallT, 0, wallH / 2,  size / 2); // front
    mkWall(wallT, wallH, size, -size / 2, wallH / 2, 0); // left
    mkWall(wallT, wallH, size,  size / 2, wallH / 2, 0); // right

    // ceiling (dark)
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1.0 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, wallH, 0);
    this.room.add(ceil);

    // --- Neon frames for future pictures (glowing mounts) ---
    this._buildNeonFrames();

    // --- Lighting pack (bright enough for Quest) ---
    this._buildLights(scene);

    // --- Furniture placeholders (simple casino vibe) ---
    this._buildFurniture();

    // --- Teleporter pads (visual only, your main.js teleport handles movement) ---
    this._buildTeleporterPads();

    // --- Action board + Leaderboard board ---
    this._buildBoards();

    // --- Spawn safe (no objects on top) ---
    if (rig) {
      rig.position.set(0, 0, 8);
      rig.rotation.set(0, 0, 0);
    }

    // --- Start Poker Simulation (boss table center) ---
    PokerSim.setHooks({
      setActionText: (txt) => this._setActionBoardText(txt),
      setLeaderboard: (rows, title) => this._setLeaderboard(rows, title),
      getCamera: () => this._camera,
    });

    PokerSim.build(scene, {
      tableCenter: new THREE.Vector3(0, 0, -6.5),
      tableRadius: 3.0,
      spectatorZ: 2.5,
    });

    this._built = true;
  },

  update(dt, camera, rig) {
    // keep internal refs current
    if (camera) this._camera = camera;
    if (rig) this._rig = rig;

    // animate boards to always face the player a bit (nice readability)
    if (this.boardAction && this._camera) {
      this.boardAction.lookAt(this._camera.position);
    }
    if (this.boardLeaderboard && this._camera) {
      this.boardLeaderboard.lookAt(this._camera.position);
    }

    PokerSim.update(dt, this._camera);
  },

  // ---------- Boards ----------
  _buildBoards() {
    // Action board (POT / ACTION / WIN HAND)
    this._actionCanvas = document.createElement("canvas");
    this._actionCanvas.width = 1024;
    this._actionCanvas.height = 512;
    this._actionCtx = this._actionCanvas.getContext("2d");
    this._actionTex = new THREE.CanvasTexture(this._actionCanvas);
    this._actionTex.colorSpace = THREE.SRGBColorSpace;

    const actionMat = new THREE.MeshBasicMaterial({
      map: this._actionTex,
      transparent: true,
      opacity: 1,
    });

    const actionPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.9), actionMat);
    actionPlane.position.set(0, 2.6, -3.2); // higher and visible from far
    actionPlane.name = "ActionBoard";
    this._scene.add(actionPlane);
    this.boardAction = actionPlane;

    this._setActionBoardText("BOOTING…");

    // Leaderboard board (big in the back)
    this._leaderCanvas = document.createElement("canvas");
    this._leaderCanvas.width = 1024;
    this._leaderCanvas.height = 1024;
    this._leaderCtx = this._leaderCanvas.getContext("2d");
    this._leaderTex = new THREE.CanvasTexture(this._leaderCanvas);
    this._leaderTex.colorSpace = THREE.SRGBColorSpace;

    const leaderMat = new THREE.MeshBasicMaterial({
      map: this._leaderTex,
      transparent: true,
      opacity: 1,
    });

    const leaderPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), leaderMat);
    leaderPlane.position.set(0, 2.8, -12.2);
    leaderPlane.name = "LeaderboardBoard";
    this._scene.add(leaderPlane);
    this.boardLeaderboard = leaderPlane;

    this._setLeaderboard([], "BOSS TOURNAMENT — TOP 10");
  },

  _setActionBoardText(text) {
    const ctx = this._actionCtx;
    if (!ctx) return;

    // background glass
    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 1024, 512);

    // neon border
    ctx.strokeStyle = "rgba(0,255,170,0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 996, 484);

    // title
    ctx.font = "bold 46px Arial";
    ctx.fillStyle = "rgba(0,255,170,0.95)";
    ctx.fillText("SKYLARK — LIVE TABLE", 40, 70);

    // main text
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.96)";

    // wrap lines
    const lines = String(text || "").split("\n").slice(0, 6);
    let y = 150;
    for (const line of lines) {
      ctx.fillText(line, 40, y);
      y += 62;
    }

    this._actionTex.needsUpdate = true;
  },

  _setLeaderboard(rows, title = "BOSS TOURNAMENT — TOP 10") {
    const ctx = this._leaderCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 1024, 1024);

    // deep glass bg
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, 1024, 1024);

    // neon red frame
    ctx.strokeStyle = "rgba(255,40,80,0.92)";
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, 988, 988);

    // title
    ctx.font = "bold 64px Arial";
    ctx.fillStyle = "rgba(255,40,80,0.95)";
    ctx.fillText(title, 50, 110);

    // subtitle
    ctx.font = "bold 34px Arial";
    ctx.fillStyle = "rgba(0,255,170,0.90)";
    ctx.fillText("BEST OF 10 ROUNDS", 50, 165);

    // table header
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("#", 70, 240);
    ctx.fillText("BOT", 130, 240);
    ctx.fillText("WINS", 650, 240);
    ctx.fillText("CHIPS", 780, 240);

    // rows
    ctx.font = "bold 34px Arial";
    let y = 300;
    const list = Array.isArray(rows) ? rows.slice(0, 10) : [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const rank = i + 1;

      const isTop3 = rank <= 3;
      ctx.fillStyle = isTop3 ? "rgba(0,255,170,0.95)" : "rgba(255,255,255,0.92)";

      ctx.fillText(String(rank), 70, y);
      ctx.fillText(String(r.name ?? `Bot ${rank}`), 130, y);
      ctx.fillText(String(r.wins ?? 0), 670, y);
      ctx.fillText(String(r.chips ?? 0), 780, y);
      y += 70;
    }

    this._leaderTex.needsUpdate = true;
  },

  // ---------- Room details ----------
  _buildNeonFrames() {
    const frames = new THREE.Group();
    frames.name = "NeonFrames";
    this.room.add(frames);

    const mkFrame = (x, y, z, w = 2.1, h = 1.3) => {
      const frame = new THREE.Group();
      frame.position.set(x, y, z);

      const glowMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.6,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.3,
      });

      const outer = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), glowMat);
      const inner = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1.0 })
      );
      inner.position.z = 0.01;

      frame.add(outer, inner);
      frames.add(frame);
    };

    // back wall frames
    mkFrame(-7, 2.2, -12.45);
    mkFrame(-3.5, 2.2, -12.45);
    mkFrame( 3.5, 2.2, -12.45);
    mkFrame( 7, 2.2, -12.45);

    // side wall frames
    mkFrame(-12.45, 2.2, -5, 1.7, 1.2);
    mkFrame(-12.45, 2.2,  2, 1.7, 1.2);
    mkFrame( 12.45, 2.2, -5, 1.7, 1.2);
    mkFrame( 12.45, 2.2,  2, 1.7, 1.2);

    frames.children.forEach(f => {
      // orient frames properly depending on wall
      if (Math.abs(f.position.z + 12.45) < 0.2) {
        f.rotation.y = 0;
      } else if (Math.abs(f.position.x + 12.45) < 0.2) {
        f.rotation.y = Math.PI / 2;
      } else if (Math.abs(f.position.x - 12.45) < 0.2) {
        f.rotation.y = -Math.PI / 2;
      }
    });
  },

  _buildLights(scene) {
    // keep any existing lights, but add a stable pack
    const a = new THREE.PointLight(0x66aaff, 0.55, 50);
    a.position.set(-6, 3.2, 6);
    scene.add(a);

    const b = new THREE.PointLight(0x00ffaa, 0.45, 55);
    b.position.set(6, 3.0, 2);
    scene.add(b);

    const c = new THREE.PointLight(0xff2a6a, 0.28, 45);
    c.position.set(0, 3.6, -10);
    scene.add(c);

    this._lights.push(a, b, c);
  },

  _buildFurniture() {
    const group = new THREE.Group();
    group.name = "FurniturePack";
    this._scene.add(group);

    // simple lounge sofas (placeholders)
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0x3a2d12,
      roughness: 0.4,
      metalness: 0.25,
      emissive: 0x2b1c08,
      emissiveIntensity: 0.1,
    });

    const mkSofa = (x, z, rot = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rot;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 1.1), sofaMat);
      base.position.y = 0.25;

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.2), sofaMat);
      back.position.set(0, 0.85, -0.45);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 1.1), sofaMat);
      armL.position.set(-1.3, 0.55, 0);

      const armR = armL.clone();
      armR.position.x = 1.3;

      const trim = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.2), goldMat);
      trim.position.y = 0.04;

      g.add(base, back, armL, armR, trim);
      group.add(g);
    };

    mkSofa(-8, 9, Math.PI);
    mkSofa( 8, 9, Math.PI);

    // tables
    const tMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8 });
    const mkSideTable = (x, z) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.55, 24), tMat);
      t.position.set(x, 0.275, z);
      group.add(t);
    };
    mkSideTable(-5.2, 8.2);
    mkSideTable( 5.2, 8.2);
  },

  _buildTeleporterPads() {
    const group = new THREE.Group();
    group.name = "TeleportPads";
    this._scene.add(group);

    const mkPad = (label, x, z, color = 0x00ffaa) => {
      const pad = new THREE.Group();
      pad.position.set(x, 0.01, z);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;

      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(0.52, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
      );
      fill.rotation.x = -Math.PI / 2;

      pad.add(fill, ring);
      pad.name = `Pad_${label}`;
      group.add(pad);

      // tiny floating text plate (placeholder for menu later)
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = "rgba(0,255,170,0.9)";
      ctx.lineWidth = 10;
      ctx.strokeRect(14, 14, 484, 228);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = "bold 64px Arial";
      ctx.fillText(label, 40, 150);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.7),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      plate.position.set(0, 1.15, 0);
      plate.rotation.y = Math.PI;
      pad.add(plate);
    };

    mkPad("LOBBY", -6, 6, 0x66aaff);
    mkPad("POKER",  0, 6, 0x00ffaa);
    mkPad("STORE",  6, 6, 0xff2a6a);
  },
};
