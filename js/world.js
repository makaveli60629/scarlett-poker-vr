// /js/world.js — Skylark Poker VR World (9.0)
// World + Room + Lighting + Leaderboard + Poker Sim Hook
// Texture-safe: will NOT crash if images are missing.

import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  group: null,
  texLoader: null,

  // ===== Texture guard =====
  _tex(path, repeat = [1, 1]) {
    // returns { map, ok } but never throws
    const tex = this.texLoader.load(
      path,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat[0], repeat[1]);
        t.anisotropy = 4;
        t.needsUpdate = true;
      },
      undefined,
      () => {
        // keep silent (do not spam)
      }
    );
    return tex;
  },

  matFromTexture(file, fallbackColor = 0x222222, opts = {}) {
    const {
      repeat = [1, 1],
      roughness = 0.9,
      metalness = 0.05,
      emissive = 0x000000,
      emissiveIntensity = 0.0,
    } = opts;

    const path = `assets/textures/${file}`;
    let map = null;

    try {
      map = this._tex(path, repeat);
    } catch {
      map = null;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: fallbackColor,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
      map: map || null,
    });

    return mat;
  },

  // ===== Build =====
  async build(scene, playerRig, camera) {
    // params are intentionally flexible:
    // - playerRig: your XR rig / player group (spawn will be set here)
    // - camera: used for facing UI (optional)

    this.group = new THREE.Group();
    this.group.name = "SkylarkWorld";
    this.texLoader = new THREE.TextureLoader();

    // Strongly define "floor at y=0"
    // Player should stand above it
    if (playerRig) {
      playerRig.position.set(0, 0, 5);
    }

    // Background + fog to keep it stable and not “scary”
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.Fog(0x05070a, 10, 45);

    // Lighting (balanced, elegant)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.85);
    hemi.position.set(0, 15, 0);
    this.group.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(7, 12, 5);
    key.castShadow = false;
    this.group.add(key);

    const fill = new THREE.PointLight(0x66ccff, 0.55, 30);
    fill.position.set(-7, 6, 2);
    this.group.add(fill);

    const warm = new THREE.PointLight(0xffcc77, 0.45, 30);
    warm.position.set(6, 6, -6);
    this.group.add(warm);

    // Room dimensions
    const roomW = 26;
    const roomD = 30;
    const wallH = 6.2;

    // ===== Floor (use Marblegold floors.jpg if present) =====
    const floorMat = this.matFromTexture("Marblegold floors.jpg", 0x1b1e22, {
      repeat: [3, 4],
      roughness: 0.65,
      metalness: 0.15,
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -3);
    floor.receiveShadow = true;
    floor.name = "Floor";
    this.group.add(floor);

    // ===== Walls (stone runes or brick fallback) =====
    const wallMat = this.matFromTexture("wall_stone_runes.jpg", 0x2a2a2a, {
      repeat: [3, 1.5],
      roughness: 0.95,
      metalness: 0.02,
    });

    const wallGeo = new THREE.BoxGeometry(roomW, wallH, 0.45);

    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, wallH / 2, -3 - roomD / 2);
    this.group.add(backWall);

    const frontWall = new THREE.Mesh(wallGeo, wallMat);
    frontWall.position.set(0, wallH / 2, -3 + roomD / 2);
    this.group.add(frontWall);

    const sideGeo = new THREE.BoxGeometry(0.45, wallH, roomD);

    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(-roomW / 2, wallH / 2, -3);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(sideGeo, wallMat);
    rightWall.position.set(roomW / 2, wallH / 2, -3);
    this.group.add(rightWall);

    // ===== Ceiling dome (optional texture) =====
    const ceilMat = this.matFromTexture("ceiling_dome_main.jpg", 0x0d0f12, {
      repeat: [1, 1],
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x080808,
      emissiveIntensity: 0.2,
    });

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      ceilMat
    );
    dome.position.set(0, wallH + 7.0, -3);
    this.group.add(dome);

    // ===== Decorative glowing wall frames (placeholders for art) =====
    // You asked: “frames that glow where pictures will be mounted”
    const frames = new THREE.Group();
    frames.name = "WallFrames";

    const makeFrame = (x, y, z, rotY, texName) => {
      const frame = new THREE.Group();
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;

      const plateMat = this.matFromTexture(texName, 0x111111, {
        repeat: [1, 1],
        roughness: 0.85,
        metalness: 0.15,
        emissive: 0x050505,
        emissiveIntensity: 0.35,
      });

      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 1.8),
        plateMat
      );

      const border = new THREE.Mesh(
        new THREE.BoxGeometry(3.35, 1.95, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0xffd27a,
          roughness: 0.35,
          metalness: 0.35,
          emissive: 0xffd27a,
          emissiveIntensity: 0.55,
        })
      );
      border.position.z = -0.05;

      const glow = new THREE.PointLight(0xffd27a, 0.35, 6);
      glow.position.set(0, 0, 0.8);

      frame.add(plate, border, glow);
      frames.add(frame);
    };

    // back wall frames
    makeFrame(-7, 3.2, -3 - roomD / 2 + 0.28, 0, "casino_art.jpg");
    makeFrame( 0, 3.2, -3 - roomD / 2 + 0.28, 0, "casino_art.jpg");
    makeFrame( 7, 3.2, -3 - roomD / 2 + 0.28, 0, "casino_art.jpg");

    // side wall frames
    makeFrame(-roomW / 2 + 0.28, 3.2, -8, Math.PI / 2, "casino_art.jpg");
    makeFrame( roomW / 2 - 0.28, 3.2, -8, -Math.PI / 2, "casino_art.jpg");

    this.group.add(frames);

    // ===== Leaderboard (glassy black screen, high, visible) =====
    const leaderboard = this._makeLeaderboardPanel();
    leaderboard.position.set(0, 4.4, -3 - roomD / 2 + 1.2); // high & on back wall
    this.group.add(leaderboard);

    const setLeaderboard = (lines) => this._setLeaderboardLines(leaderboard, lines);

    // ===== Boss Table zone + rail =====
    // Center it safely away from walls:
    // floor center is z=-3, back wall is at z=-3-roomD/2
    // so table z should be around -7 to -9
    BossTable.center.set(0, 0, -8.0);
    BossTable.build(scene);

    // ===== Poker Simulation table center MUST match BossTable center =====
    const sim = new PokerSimulation({
      camera: camera || null,
      tableCenter: new THREE.Vector3(0, 0, -8.0),
      onLeaderboard: setLeaderboard,
    });

    await sim.build(scene);

    // Keep references
    this.sim = sim;
    this.leaderboard = leaderboard;

    // Add world group last
    scene.add(this.group);

    // Provide an update function to main.js
    return {
      world: this.group,
      sim,
      update: (dt) => {
        // keep UI facing camera and sim moving
        if (this.sim) this.sim.update(dt);
      },
    };
  },

  // ===== Leaderboard panel =====
  _makeLeaderboardPanel() {
    const group = new THREE.Group();
    group.name = "LeaderboardPanel";

    // frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.2, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        roughness: 0.3,
        metalness: 0.35,
        emissive: 0xffd27a,
        emissiveIntensity: 0.55,
      })
    );
    group.add(frame);

    // screen
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 2.8),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
      })
    );
    screen.position.z = 0.07;
    group.add(screen);

    // store
    group.userData.canvas = canvas;
    group.userData.ctx = ctx;
    group.userData.tex = tex;
    group.userData.screen = screen;

    // initial
    this._drawLeaderboard(ctx, [
      "Boss Tournament — Top 10",
      "1) —",
      "2) —",
      "3) —",
      "4) —",
    ]);
    tex.needsUpdate = true;

    // glow
    const glow = new THREE.PointLight(0x00ffaa, 0.45, 10);
    glow.position.set(0, 0, 2);
    group.add(glow);

    return group;
  },

  _setLeaderboardLines(panel, lines) {
    if (!panel?.userData?.ctx) return;
    this._drawLeaderboard(panel.userData.ctx, lines);
    panel.userData.tex.needsUpdate = true;
  },

  _drawLeaderboard(ctx, lines) {
    ctx.clearRect(0, 0, 1024, 512);

    // glassy black
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, 1024, 512);

    // header
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#ffd27a";
    ctx.fillText("Skylark — Boss Tournament", 40, 80);

    // lines
    ctx.font = "bold 44px Arial";
    const colors = ["#00ffaa", "#2bd7ff", "#ff2bd6", "#ffffff", "#ffffff", "#ffffff"];
    let y = 160;

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      ctx.fillStyle = colors[i] || "#ffffff";
      ctx.fillText(lines[i], 60, y);
      y += 56;
    }

    // footer
    ctx.font = "28px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Best of 10 hands — crown held 60s — bots walk away when busted", 40, 480);
  },
};
