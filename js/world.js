// /js/world.js — VIP Lobby World (8.2.4)
// Permanent alignment + stability world layer.
// Goals:
// - True floor at y=0 (fix "half body in floor" / "too high")
// - Safe spawn pad (no table spawn)
// - Solid room boundaries (simple clamp collision)
// - Boss table + rail + main poker sim table placed safely away from walls
// - Big glassy leaderboard on wall
// - Wall art frames (glowing placeholders)
// - No texture crashes (safe loaders)

import * as THREE from "./three.js";
import { Leaderboard } from "./leaderboard.js";
import { PokerSimulation } from "./poker_simulation.js";

// Optional modules (only used if present in your repo)
let BossTable = null;
try {
  const mod = await import("./boss_table.js");
  BossTable = mod?.BossTable || null;
} catch (e) {
  // Safe: boss_table.js not required
}

export const World = {
  // Core refs
  scene: null,
  rig: null,
  camera: null,

  // Groups
  root: null,
  room: null,
  deco: null,

  // Systems
  sim: null,
  boardDataLines: null,

  // World constants
  ROOM_W: 22,
  ROOM_D: 22,
  WALL_H: 4.8,

  // Spawn
  SPAWN: new THREE.Vector3(0, 0, 7.5),

  // Simple collision padding so you don't clip into walls
  WALL_PAD: 0.55,

  // Texture loader (safe)
  _texLoader: new THREE.TextureLoader(),

  // --------- SAFE MATERIALS ----------
  safeTex(path, { repeat = [1, 1] } = {}) {
    // Returns texture or null; never throws
    try {
      const t = this._texLoader.load(
        path,
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(repeat[0], repeat[1]);
          tex.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => {
          // missing texture is fine
        }
      );
      return t || null;
    } catch {
      return null;
    }
  },

  matColor(hex, { roughness = 0.9, metalness = 0.0, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
    return new THREE.MeshStandardMaterial({
      color: hex,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
    });
  },

  matTex(tex, fallbackHex, opts = {}) {
    if (!tex) return this.matColor(fallbackHex, opts);
    return new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: opts.roughness ?? 0.9,
      metalness: opts.metalness ?? 0.0,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
  },

  // --------- BUILD ----------
  async build(scene, rig, camera) {
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;

    // Root group
    this.root = new THREE.Group();
    this.root.name = "WorldRoot";
    scene.add(this.root);

    this.room = new THREE.Group();
    this.room.name = "VIPRoom";
    this.root.add(this.room);

    this.deco = new THREE.Group();
    this.deco.name = "Decor";
    this.root.add(this.deco);

    // Always reset rig to spawn at build time
    this.setPlayerSpawn();

    // Environment
    this.buildSkyFog();
    this.buildLights();
    this.buildRoomShell();
    this.buildSpawnPad();
    this.buildCornerMarkers();
    this.buildWallFrames();
    this.buildLeaderboardWall();

    // Boss table (optional)
    this.buildBossTable();

    // Poker sim table center (SAFE — not in wall)
    const tableCenter = new THREE.Vector3(0, 0, -4.5);

    // Build poker sim
    this.sim = new PokerSimulation({
      camera: this.camera,
      tableCenter,
      onLeaderboard: (lines) => {
        // cache it; we pass to Leaderboard.update
        this.boardDataLines = lines || null;
      },
    });

    await this.sim.build(this.root);

    return this.root;
  },

  // --------- WORLD PIECES ----------
  buildSkyFog() {
    // Keep visible in Quest (no black void)
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 3, 60);
  },

  buildLights() {
    // Strong but not washed out
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 12, 6);
    this.scene.add(dir);

    // Lobby fills
    const p1 = new THREE.PointLight(0x66aaff, 0.6, 38);
    p1.position.set(-7, 3.2, 5);
    this.scene.add(p1);

    const p2 = new THREE.PointLight(0x00ffaa, 0.45, 34);
    p2.position.set(7, 2.8, -2);
    this.scene.add(p2);

    // Table uplift
    const up = new THREE.PointLight(0xffffff, 0.22, 18);
    up.position.set(0, 1.3, -4);
    this.scene.add(up);

    // Ceiling glow ring (subtle)
    const ceilingGlow = new THREE.PointLight(0xff2bd6, 0.18, 30);
    ceilingGlow.position.set(0, this.WALL_H - 0.35, -1);
    this.scene.add(ceilingGlow);
  },

  buildRoomShell() {
    // True floor at y=0 (this is the key alignment fix)
    const w = this.ROOM_W;
    const d = this.ROOM_D;
    const h = this.WALL_H;

    // FLOOR (thin box gives “physical” look and prevents z-fighting)
    const floorTex = this.safeTex("assets/textures/marble_gold.jpg", { repeat: [6, 6] });
    const floorMat = this.matTex(floorTex, 0x2b2f36, { roughness: 0.85 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
    floor.name = "Floor";
    floor.position.set(0, -0.06, 0); // top surface is y=0
    floor.receiveShadow = true;
    this.room.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.10, d),
      this.matColor(0x0b0d14, { roughness: 1.0 })
    );
    ceil.name = "Ceiling";
    ceil.position.set(0, h, 0);
    this.room.add(ceil);

    // Walls (solid visuals; collision handled in clamp)
    const wallTex = this.safeTex("assets/textures/brick_wall.jpg", { repeat: [6, 2] });
    const wallMat = this.matTex(wallTex, 0x1b1f2a, { roughness: 0.95 });

    const wallT = 0.18;
    const halfW = w / 2;
    const halfD = d / 2;

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallT), wallMat);
    wallN.position.set(0, h / 2, -halfD);
    wallN.name = "Wall_N";
    this.room.add(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallT), wallMat);
    wallS.position.set(0, h / 2, halfD);
    wallS.name = "Wall_S";
    this.room.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallT, h, d), wallMat);
    wallE.position.set(halfW, h / 2, 0);
    wallE.name = "Wall_E";
    this.room.add(wallE);

    const wallWm = new THREE.Mesh(new THREE.BoxGeometry(wallT, h, d), wallMat);
    wallWm.position.set(-halfW, h / 2, 0);
    wallWm.name = "Wall_W";
    this.room.add(wallWm);

    // Trim band
    const trimMat = this.matColor(0x2a1b10, { roughness: 0.75, emissive: 0x0a0603, emissiveIntensity: 0.35 });
    const trimH = 0.10;

    const trimN = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, trimH, 0.10), trimMat);
    trimN.position.set(0, 1.15, -halfD + 0.10);
    this.room.add(trimN);

    const trimS = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, trimH, 0.10), trimMat);
    trimS.position.set(0, 1.15, halfD - 0.10);
    this.room.add(trimS);

    const trimE = new THREE.Mesh(new THREE.BoxGeometry(0.10, trimH, d - 0.2), trimMat);
    trimE.position.set(halfW - 0.10, 1.15, 0);
    this.room.add(trimE);

    const trimW = new THREE.Mesh(new THREE.BoxGeometry(0.10, trimH, d - 0.2), trimMat);
    trimW.position.set(-halfW + 0.10, 1.15, 0);
    this.room.add(trimW);
  },

  buildSpawnPad() {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.03, 32),
      this.matColor(0x00ffaa, { roughness: 0.25, emissive: 0x00ffaa, emissiveIntensity: 1.2 })
    );
    pad.position.set(this.SPAWN.x, 0.015, this.SPAWN.z);
    pad.name = "SpawnPad";
    this.deco.add(pad);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.035, 10, 60),
      this.matColor(0xff2bd6, { roughness: 0.3, emissive: 0xff2bd6, emissiveIntensity: 1.1 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(this.SPAWN.x, 0.03, this.SPAWN.z);
    this.deco.add(ring);
  },

  buildCornerMarkers() {
    // 4 neon orbs you liked
    const halfW = this.ROOM_W / 2 - 0.9;
    const halfD = this.ROOM_D / 2 - 0.9;

    const orbMat = this.matColor(0x00ffaa, { roughness: 0.2, emissive: 0x00ffaa, emissiveIntensity: 1.4 });
    const orbGeo = new THREE.SphereGeometry(0.18, 18, 18);

    const corners = [
      [ halfW, 0.25,  halfD],
      [-halfW, 0.25,  halfD],
      [ halfW, 0.25, -halfD],
      [-halfW, 0.25, -halfD],
    ];

    for (const c of corners) {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(c[0], c[1], c[2]);
      this.deco.add(orb);

      const glow = new THREE.PointLight(0x00ffaa, 0.25, 6);
      glow.position.copy(orb.position);
      this.deco.add(glow);
    }
  },

  buildWallFrames() {
    // Glowing “art frames” placeholders (you’ll swap textures later)
    const halfD = this.ROOM_D / 2 - 0.2;
    const y = 2.2;

    const frameCount = 4;
    const gap = 3.0;
    const startX = -((frameCount - 1) * gap) / 2;

    for (let i = 0; i < frameCount; i++) {
      const x = startX + i * gap;

      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(1.65, 1.05),
        new THREE.MeshStandardMaterial({
          color: 0x05070d,
          roughness: 0.9,
          metalness: 0.1,
          transparent: true,
          opacity: 0.75,
          emissive: 0x000000,
        })
      );
      back.position.set(x, y, -halfD + 0.06);
      back.rotation.y = Math.PI;

      const border = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.66, 4),
        this.matColor(0xff2bd6, { roughness: 0.25, emissive: 0xff2bd6, emissiveIntensity: 1.2 })
      );
      border.position.set(x, y, -halfD + 0.07);
      border.rotation.y = Math.PI;
      border.rotation.z = Math.PI / 4;

      const glow = new THREE.PointLight(0xff2bd6, 0.18, 5);
      glow.position.set(x, y, -halfD + 0.55);

      this.deco.add(back, border, glow);
    }
  },

  buildLeaderboardWall() {
    // Uses your leaderboard.js module (glassy board look)
    // Place it where you can see it from spawn.
    Leaderboard.build(this.root);

    // Push it onto the far wall, higher up, centered.
    if (Leaderboard.group) {
      const halfD = this.ROOM_D / 2 - 0.2;
      Leaderboard.group.position.set(0, 2.55, -halfD + 0.25);
      Leaderboard.group.rotation.y = Math.PI; // face inward
    }
  },

  buildBossTable() {
    if (!BossTable?.build) return;

    // Boss table is spectator-only centerpiece farther back
    // Keep it safely away from wall by putting it at z=-7.0
    try {
      BossTable.center = new THREE.Vector3(0, 0, -7.0);
      BossTable.build(this.scene);
    } catch (e) {
      console.warn("BossTable build failed (safe):", e);
    }
  },

  // --------- PLAYER / COLLISION ----------
  setPlayerSpawn() {
    if (!this.rig) return;
    this.rig.position.set(this.SPAWN.x, 0, this.SPAWN.z);
    this.rig.rotation.y = 0;
  },

  clampPlayerToRoom() {
    // Simple room bounds collision: clamps rig x/z
    if (!this.rig) return;

    const halfW = this.ROOM_W / 2 - this.WALL_PAD;
    const halfD = this.ROOM_D / 2 - this.WALL_PAD;

    this.rig.position.x = THREE.MathUtils.clamp(this.rig.position.x, -halfW, halfW);
    this.rig.position.z = THREE.MathUtils.clamp(this.rig.position.z, -halfD, halfD);

    // Keep world height stable (do NOT let rig drift)
    this.rig.position.y = 0;
  },

  // --------- UPDATE LOOP ----------
  update(dt, camera) {
    if (camera) this.camera = camera;

    // Keep player safely in the room
    this.clampPlayerToRoom();

    // Poker sim update
    if (this.sim) {
      this.sim.camera = this.camera;
      this.sim.update(dt);
    }

    // Update leaderboard (make it show the latest sim standings)
    if (Leaderboard?.update) {
      let data = null;

      // If we have lines, translate into leaderboard.js format
      if (this.boardDataLines && this.boardDataLines.length) {
        // Expect lines like:
        // ["Boss Tournament — Hand 1/10", "1) Name — $...", ...]
        const rows = [];
        for (let i = 1; i < Math.min(this.boardDataLines.length, 11); i++) {
          const line = this.boardDataLines[i];
          const m = line.match(/^\s*\d+\)\s*(.*?)\s*—\s*\$(\d+)/);
          if (m) rows.push({ name: m[1], points: Number(m[2]) });
        }
        data = {
          title: (this.boardDataLines[0] || "BOSS TOURNAMENT"),
          rows: rows.length ? rows : [
            { name: "Spades", points: 0 },
            { name: "Hearts", points: 0 },
            { name: "Clubs", points: 0 },
            { name: "Diamonds", points: 0 },
          ],
          footer: "Top 10 • Boss Tournament Simulation",
        };
      }

      Leaderboard.update(dt, this.camera, data);
    }
  },
};
