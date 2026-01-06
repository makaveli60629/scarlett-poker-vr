// /js/world.js — Skylark Poker VR World (Update 9.0 Fix Pack)
// Fixes: textures actually load (safe loader), bigger room + taller walls,
// centerpiece table + rails, back-wall leaderboard, framed art, plants, chairs.

import * as THREE from "./three.js";

export const World = {
  bounds: null,
  lookTarget: null,

  scene: null,
  player: null,
  camera: null,

  env: null,

  roomCenter: new THREE.Vector3(0, 0, -6.0),
  spawnPad: null,

  // texture loader
  _tl: null,

  async build(scene, player, camera) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;

    this.env = new THREE.Group();
    this.env.name = "WorldEnv";
    scene.add(this.env);

    this._tl = new THREE.TextureLoader();

    this.buildLighting();
    this.buildRoomBig();
    this.buildTeleportMachine();
    this.buildRailsFallback();
    this.buildDecor();

    // Poker sim (ONE table, spectator-only)
    await this.buildPokerSim();

    // Bounds (simple solid)
    this.bounds = {
      minX: -12,
      maxX:  12,
      minZ: -26,
      maxZ:  10,
    };

    this.lookTarget = this.roomCenter.clone();

    this.resetSpawn();
  },

  resetSpawn() {
    if (!this.spawnPad) {
      this.player.position.set(0, 0, 6);
      return;
    }
    const p = this.spawnPad.position.clone();
    this.player.position.set(p.x, 0, p.z + 1.4);
  },

  buildLighting() {
    // MUCH brighter (your art was too dark)
    this.env.add(new THREE.AmbientLight(0xffffff, 0.85));

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(10, 14, 8);
    this.env.add(key);

    const warm = new THREE.PointLight(0xffcc88, 0.9, 60);
    warm.position.set(7, 4.5, -8);
    this.env.add(warm);

    const cool = new THREE.PointLight(0x66bbff, 0.65, 60);
    cool.position.set(-7, 4.5, -8);
    this.env.add(cool);

    const ceiling = new THREE.PointLight(0xffffff, 0.85, 80);
    ceiling.position.set(0, 7.5, -10);
    this.env.add(ceiling);
  },

  // safe texture helper (NEVER crashes)
  safeTex(file, repeatX = 2, repeatY = 2) {
    const path = `assets/textures/${file}`;
    const tex = this._tl.load(
      path,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeatX, repeatY);
        t.anisotropy = 4;
      },
      undefined,
      () => console.warn("Missing texture:", path)
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  matWithTex(file, fallbackColor, repeatX = 2, repeatY = 2, roughness = 0.95, metalness = 0.05) {
    const tex = this.safeTex(file, repeatX, repeatY);
    return new THREE.MeshStandardMaterial({
      map: tex,
      color: fallbackColor,
      roughness,
      metalness
    });
  },

  buildRoomBig() {
    // You asked: walls twice as big + room bigger
    const W = 26;
    const H = 11.5; // taller
    const D = 36;

    // Floor texture
    const floorMat = this.matWithTex("Marblegold floors.jpg", 0xffffff, 6, 6, 0.9, 0.08);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -8);
    floor.name = "Floor";
    this.env.add(floor);

    // Walls
    const wallMatA = this.matWithTex("brickwall.jpg", 0xffffff, 4, 2, 0.98, 0.02);
    const wallMatB = this.matWithTex("wall_stone_runes.jpg", 0xffffff, 3, 2, 0.98, 0.02);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMatA);
    back.position.set(0, H / 2, -8 - D / 2);
    this.env.add(back);

    const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMatB);
    front.rotation.y = Math.PI;
    front.position.set(0, H / 2, -8 + D / 2);
    this.env.add(front);

    const sideGeo = new THREE.PlaneGeometry(D, H);

    const left = new THREE.Mesh(sideGeo, wallMatA);
    left.rotation.y = Math.PI / 2;
    left.position.set(-W / 2, H / 2, -8);
    this.env.add(left);

    const right = new THREE.Mesh(sideGeo, wallMatB);
    right.rotation.y = -Math.PI / 2;
    right.position.set(W / 2, H / 2, -8);
    this.env.add(right);

    // Gold trim near floor
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0x332200,
      emissiveIntensity: 0.25,
      roughness: 0.32,
      metalness: 0.6
    });

    const trimH = 0.22;
    const trimT = 0.12;

    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), trimMat);
    trimBack.position.set(0, trimH / 2, -8 - D / 2 + 0.06);
    this.env.add(trimBack);

    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), trimMat);
    trimFront.position.set(0, trimH / 2, -8 + D / 2 - 0.06);
    this.env.add(trimFront);

    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), trimMat);
    trimLeft.position.set(-W / 2 + 0.06, trimH / 2, -8);
    this.env.add(trimLeft);

    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), trimMat);
    trimRight.position.set(W / 2 - 0.06, trimH / 2, -8);
    this.env.add(trimRight);

    // Corner pillars
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.55,
      metalness: 0.25
    });

    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.32, H, 18);
    const corners = [
      new THREE.Vector3(-W / 2 + 0.35, H / 2, -8 - D / 2 + 0.35),
      new THREE.Vector3( W / 2 - 0.35, H / 2, -8 - D / 2 + 0.35),
      new THREE.Vector3(-W / 2 + 0.35, H / 2, -8 + D / 2 - 0.35),
      new THREE.Vector3( W / 2 - 0.35, H / 2, -8 + D / 2 - 0.35),
    ];

    corners.forEach((p) => {
      const pil = new THREE.Mesh(pillarGeo, pillarMat);
      pil.position.copy(p);
      this.env.add(pil);

      const cap = new THREE.PointLight(0xffd27a, 0.35, 10);
      cap.position.set(p.x, H - 0.35, p.z);
      this.env.add(cap);
    });

    // Back-wall leaderboard (high)
    this.buildLeaderboard(new THREE.Vector3(0, 7.8, -8 - D / 2 + 0.09));
  },

  buildLeaderboard(pos) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // render function
    const paint = (lines) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // glassy black
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // border
      ctx.strokeStyle = "rgba(255,210,122,0.85)";
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // title
      ctx.font = "bold 64px Arial";
      ctx.fillStyle = "#ffd27a";
      ctx.fillText("Skylark Boss Leaderboard", 50, 90);

      // lines
      ctx.font = "bold 54px Arial";
      const colors = ["#00ffaa", "#2bd7ff", "#ff2bd6", "#ffffff", "#ffffff"];
      lines.forEach((t, i) => {
        ctx.fillStyle = colors[i] || "#ffffff";
        ctx.fillText(t, 70, 170 + i * 70);
      });
    };

    paint([
      "1) King of Spades — $20000",
      "2) Queen of Spades — $20000",
      "3) Jack of Spades — $20000",
      "4) Ace of Spades — $20000",
    ]);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 4.0), mat);
    board.position.copy(pos);

    this.env.add(board);

    // store so poker sim can update it
    this._leaderboard = { board, canvas, ctx, tex, paint };
  },

  buildTeleportMachine() {
    const padCenter = new THREE.Vector3(0, 0, 7.0);

    const g = new THREE.Group();
    g.position.copy(padCenter);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.78, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9 })
    );
    base.position.y = 0.07;

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.05, 12, 56),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 2.4,
        roughness: 0.35
      })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.14;

    const beacon = new THREE.PointLight(0x00ffaa, 0.9, 14);
    beacon.position.set(0, 1.8, 0);

    g.add(base, glow, beacon);
    this.env.add(g);

    this.spawnPad = g;
  },

  buildRailsFallback() {
    // Centerpiece rail around main table area
    const ring = new THREE.Group();
    ring.name = "Rail";

    const r = 6.5;
    const posts = 30;

    const postMat = new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.8, metalness: 0.25 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.6 });

    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      const x = this.roomCenter.x + Math.cos(a) * r;
      const z = this.roomCenter.z + Math.sin(a) * r;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.1, 10), postMat);
      post.position.set(x, 0.55, z);
      ring.add(post);
    }

    const bar = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 12, 90), barMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(this.roomCenter.x, 1.05, this.roomCenter.z);
    ring.add(bar);

    this.env.add(ring);
  },

  buildDecor() {
    // Art frames (bright)
    const artMat = new THREE.MeshStandardMaterial({
      map: this.safeTex("casino_art.jpg", 1, 1),
      color: 0xffffff,
      roughness: 1.0
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a, roughness: 0.35, metalness: 0.55
    });

    const makeFrame = (x, y, z, rotY = 0) => {
      const group = new THREE.Group();
      const art = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), artMat);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.75, 2.75, 0.08), frameMat);
      frame.position.z = -0.03;

      group.add(frame, art);
      group.position.set(x, y, z);
      group.rotation.y = rotY;

      const glow = new THREE.PointLight(0x66bbff, 0.5, 10);
      glow.position.set(0, 0, 1.2);
      group.add(glow);

      this.env.add(group);
    };

    // two frames along side walls
    makeFrame(-12.9 + 0.15, 4.2, -12, Math.PI / 2);
    makeFrame( 12.9 - 0.15, 4.2, -12, -Math.PI / 2);

    // Plants (low poly)
    const plant = (x, z) => {
      const g = new THREE.Group();

      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.35, 14),
        new THREE.MeshStandardMaterial({ color: 0x2a1b14, roughness: 0.9 })
      );
      pot.position.y = 0.175;

      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x1f6f3a, roughness: 0.95 })
      );
      bush.position.y = 0.75;

      g.add(pot, bush);
      g.position.set(x, 0, z);
      this.env.add(g);
    };

    plant(-9, -4);
    plant( 9, -4);
    plant(-9, -18);
    plant( 9, -18);
  },

  async buildPokerSim() {
    try {
      const mod = await import("./poker_simulation.js");
      const PokerSimulation = mod.PokerSimulation;

      this.sim = new PokerSimulation({
        camera: this.camera,
        tableCenter: this.roomCenter.clone(),
        spectatorOnly: true,
        onLeaderboard: (lines) => {
          // Update our wall leaderboard
          if (this._leaderboard) {
            this._leaderboard.paint(lines);
            this._leaderboard.tex.needsUpdate = true;
          }
        }
      });

      await this.sim.build(this.scene);

    } catch (e) {
      console.warn("PokerSimulation failed to load:", e);
    }
  },

  update(dt) {
    if (this.sim?.update) this.sim.update(dt);
  }
};
