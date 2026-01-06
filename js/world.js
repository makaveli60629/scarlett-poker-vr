// /js/world.js — Skylark Poker VR World (Update 9.0)
// Goal: one clean room, correct floor alignment, bright lighting, textures,
// teleport machine at spawn, rails, gold trim + pillars.
// SAFE: imports only from local ./three.js and your local modules.

import * as THREE from "./three.js";

// Optional texture system (if your textures.js is correct). If it fails, we fallback.
let TextureBank = null;
let Textures = null;

async function safeImportTextures() {
  try {
    const mod = await import("./textures.js");
    TextureBank = mod.TextureBank || null;
    Textures = mod.Textures || null;
  } catch (e) {
    console.warn("textures.js not loaded, using fallback materials.", e);
    TextureBank = null;
    Textures = null;
  }
}

function matStandard(opts = {}) {
  // If you have TextureBank.standard, use it; else fallback to MeshStandardMaterial.
  if (TextureBank && typeof TextureBank.standard === "function") {
    return TextureBank.standard(opts);
  }
  return new THREE.MeshStandardMaterial({
    color: opts.color ?? 0x777777,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.05,
  });
}

export const World = {
  bounds: null,       // for clamping movement
  lookTarget: null,   // camera yaw target after teleport

  // references
  scene: null,
  player: null,
  camera: null,

  // key anchors
  roomCenter: new THREE.Vector3(0, 0, -4.5),
  spawnPad: null,

  // groups
  env: null,

  async build(scene, player, camera) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;

    await safeImportTextures();

    this.env = new THREE.Group();
    this.env.name = "WorldEnv";
    scene.add(this.env);

    // Build environment
    this.buildLighting();
    this.buildRoom();
    this.buildTeleportMachine();
    await this.buildRails();
    await this.buildPokerSimOneTable(); // will place ONE table + bots

    // movement bounds (inside room)
    this.bounds = {
      minX: -8.2,
      maxX:  8.2,
      minZ: -14.2,
      maxZ:  6.2,
    };

    // yaw target = table center
    this.lookTarget = this.roomCenter.clone();

    // spawn at teleport pad every time
    this.resetSpawn();
  },

  resetSpawn() {
    if (!this.spawnPad) {
      this.player.position.set(0, 0, 3.8);
      return;
    }
    const p = this.spawnPad.position.clone();
    // Spawn slightly behind pad, facing inward
    this.player.position.set(p.x, 0, p.z + 1.2);
  },

  buildLighting() {
    // BRIGHTER (you said art is too dark)
    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    this.env.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 10, 5);
    key.castShadow = false;
    this.env.add(key);

    const fill = new THREE.PointLight(0x66bbff, 0.5, 30);
    fill.position.set(-5, 3.2, -6);
    this.env.add(fill);

    const warm = new THREE.PointLight(0xffcc88, 0.6, 30);
    warm.position.set(5, 3.0, -6);
    this.env.add(warm);

    // ceiling glow
    const ceiling = new THREE.PointLight(0xffffff, 0.65, 40);
    ceiling.position.set(0, 5.2, -6);
    this.env.add(ceiling);
  },

  buildRoom() {
    // Room dimensions
    const W = 18;
    const H = 6.2;
    const D = 22;

    const floorMat = matStandard({
      mapFile: Textures?.MARBLE_GOLD_FLOOR || "Marblegold floors.jpg",
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.08,
    });

    // Floor at y=0
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -4);
    floor.receiveShadow = false;
    floor.name = "Floor";
    this.env.add(floor);

    const wallMat = matStandard({
      mapFile: Textures?.BRICKWALL || "brickwall.jpg",
      color: 0xffffff,
      roughness: 0.95,
    });

    const wallMatAlt = matStandard({
      mapFile: Textures?.WALL_RUNES || "wall_stone_runes.jpg",
      color: 0xffffff,
      roughness: 0.95,
    });

    // Walls
    const wallGeo = new THREE.PlaneGeometry(W, H);

    const back = new THREE.Mesh(wallGeo, wallMat);
    back.position.set(0, H / 2, -4 - D / 2);
    back.name = "WallBack";
    this.env.add(back);

    const front = new THREE.Mesh(wallGeo, wallMatAlt);
    front.rotation.y = Math.PI;
    front.position.set(0, H / 2, -4 + D / 2);
    front.name = "WallFront";
    this.env.add(front);

    const sideGeo = new THREE.PlaneGeometry(D, H);

    const left = new THREE.Mesh(sideGeo, wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-W / 2, H / 2, -4);
    left.name = "WallLeft";
    this.env.add(left);

    const right = new THREE.Mesh(sideGeo, wallMatAlt);
    right.rotation.y = -Math.PI / 2;
    right.position.set(W / 2, H / 2, -4);
    right.name = "WallRight";
    this.env.add(right);

    // Gold trim around bottom walls
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0x332200,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.55,
    });

    const trimH = 0.18;
    const trimT = 0.10;

    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), trimMat);
    trimBack.position.set(0, trimH / 2, -4 - D / 2 + 0.05);
    this.env.add(trimBack);

    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), trimMat);
    trimFront.position.set(0, trimH / 2, -4 + D / 2 - 0.05);
    this.env.add(trimFront);

    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), trimMat);
    trimLeft.position.set(-W / 2 + 0.05, trimH / 2, -4);
    this.env.add(trimLeft);

    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), trimMat);
    trimRight.position.set(W / 2 - 0.05, trimH / 2, -4);
    this.env.add(trimRight);

    // Pillars on corners
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.55,
      metalness: 0.3,
      emissive: 0x000000,
    });

    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.24, H, 18);

    const corners = [
      new THREE.Vector3(-W / 2 + 0.3, H / 2, -4 - D / 2 + 0.3),
      new THREE.Vector3(W / 2 - 0.3, H / 2, -4 - D / 2 + 0.3),
      new THREE.Vector3(-W / 2 + 0.3, H / 2, -4 + D / 2 - 0.3),
      new THREE.Vector3(W / 2 - 0.3, H / 2, -4 + D / 2 - 0.3),
    ];

    corners.forEach((p) => {
      const pil = new THREE.Mesh(pillarGeo, pillarMat);
      pil.position.copy(p);
      this.env.add(pil);

      const cap = new THREE.PointLight(0xffd27a, 0.25, 6);
      cap.position.set(p.x, H - 0.25, p.z);
      this.env.add(cap);
    });

    // Casino art on walls (bright + glow)
    const artMat = matStandard({
      mapFile: Textures?.CASINO_ART || "casino_art.jpg",
      color: 0xffffff,
      roughness: 1.0,
    });

    const art = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.3), artMat);
    art.position.set(0, 2.9, -4 - D / 2 + 0.06);
    this.env.add(art);

    const artGlow = new THREE.PointLight(0x66bbff, 0.35, 10);
    artGlow.position.set(0, 2.9, -4 - D / 2 + 1.2);
    this.env.add(artGlow);

    // NOTE: collision is enforced by clamping movement in main.js bounds,
    // (simple + stable). If you want physical collision later, we can add it in 9.1.
  },

  buildTeleportMachine() {
    // Teleport machine must be where you spawn
    const padCenter = new THREE.Vector3(0, 0, 3.6);

    const g = new THREE.Group();
    g.name = "TeleportMachine";
    g.position.copy(padCenter);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9 })
    );
    base.position.y = 0.06;

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.04, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 2.2,
        roughness: 0.35,
      })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.12;

    const beacon = new THREE.PointLight(0x00ffaa, 0.7, 12);
    beacon.position.set(0, 1.6, 0);

    g.add(base, glow, beacon);
    this.env.add(g);

    this.spawnPad = g;
  },

  async buildRails() {
    // If spectator_rail.js exists, use it. If not, do a stable fallback rail.
    try {
      const mod = await import("./spectator_rail.js");
      if (mod?.SpectatorRail?.build) {
        // Put rail around poker area
        mod.SpectatorRail.build(this.scene, this.roomCenter, 4.9, { postCount: 26 });
        return;
      }
    } catch (e) {
      // fallback below
    }

    // Fallback: low poly rail ring
    const ring = new THREE.Group();
    ring.name = "FallbackRail";

    const r = 5.0;
    const posts = 28;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.25 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.55 });

    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      const x = this.roomCenter.x + Math.cos(a) * r;
      const z = this.roomCenter.z + Math.sin(a) * r;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 10), postMat);
      post.position.set(x, 0.55, z);
      ring.add(post);
    }

    const bar = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 12, 90), barMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(this.roomCenter.x, 1.05, this.roomCenter.z);
    ring.add(bar);

    this.env.add(ring);
  },

  async buildPokerSimOneTable() {
    // Your poker_simulation.js already exists. Use it as the ONE table source.
    try {
      const mod = await import("./poker_simulation.js");
      const PokerSimulation = mod.PokerSimulation;

      // Create sim instance with camera for facing billboards
      this.sim = new PokerSimulation({
        camera: this.camera,
        tableCenter: this.roomCenter.clone(),
        onLeaderboard: (lines) => {
          // If you have a leaderboard module later, hook it here.
          // For now, we just log to console.
          // console.log(lines.join("\n"));
        },
      });

      // IMPORTANT: build adds its tableGroup + uiGroup once
      await this.sim.build(this.scene);

      return;
    } catch (e) {
      console.warn("PokerSimulation could not load, using placeholder table.", e);
    }

    // Fallback placeholder (won't crash)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.15, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x145c3a, roughness: 0.95 })
    );
    table.position.set(this.roomCenter.x, 1.05, this.roomCenter.z);
    this.env.add(table);
  },

  update(dt) {
    // keep sim running
    if (this.sim && typeof this.sim.update === "function") {
      this.sim.update(dt);
    }
  },
};
