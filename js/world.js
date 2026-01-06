// /js/world.js — Lobby + Table + Leaderboard (8.2)
import * as THREE from "./three.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  built: false,
  sim: null,
  room: {
    minX: -11,
    maxX: 11,
    minZ: -15,
    maxZ: 9,
  },

  _texLoader: new THREE.TextureLoader(),

  safeTexture(file, repeatX = 2, repeatY = 2) {
    const path = `assets/textures/${file}`;
    try {
      const tex = this._texLoader.load(
        path,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeatX, repeatY);
          t.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => console.warn("Texture missing:", path)
      );
      return tex;
    } catch (e) {
      console.warn("Texture load failed:", path, e);
      return null;
    }
  },

  buildLobbyShell(scene) {
    // Floor
    const floorTex = this.safeTexture("Marblegold floors.jpg", 2.5, 2.5);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      map: floorTex || null,
      roughness: 0.55,
      metalness: 0.08,
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 26),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -3);
    floor.receiveShadow = false;
    floor.name = "Floor";
    scene.add(floor);

    // Walls (simple box room)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x151820,
      roughness: 0.95,
      metalness: 0.05
    });

    const wallThickness = 0.4;
    const wallHeight = 4.6;

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, wallHeight, wallThickness), wallMat);
    backWall.position.set(0, wallHeight / 2, -16);
    scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(24, wallHeight, wallThickness), wallMat);
    frontWall.position.set(0, wallHeight / 2, 10);
    scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 26), wallMat);
    leftWall.position.set(-12, wallHeight / 2, -3);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 26), wallMat);
    rightWall.position.set(12, wallHeight / 2, -3);
    scene.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 26),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 1.0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallHeight, -3);
    scene.add(ceiling);

    // Frame placeholders (glowing)
    this.buildWallFrames(scene);
    this.buildFurniture(scene);
    this.buildLeaderboard(scene);
  },

  buildWallFrames(scene) {
    const frameGroup = new THREE.Group();
    frameGroup.name = "WallFrames";

    const makeFrame = (x, y, z, rotY) => {
      const outer = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.4, 0.06),
        new THREE.MeshStandardMaterial({
          color: 0x2c2a25,
          roughness: 0.5,
          metalness: 0.35,
          emissive: 0x110a00,
          emissiveIntensity: 0.45
        })
      );
      outer.position.set(x, y, z);
      outer.rotation.y = rotY;

      const inner = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 1.2),
        new THREE.MeshStandardMaterial({
          color: 0x05060a,
          roughness: 0.7,
          emissive: 0x001122,
          emissiveIntensity: 0.35
        })
      );
      inner.position.set(x, y, z + (rotY === 0 ? 0.031 : 0));
      inner.rotation.y = rotY;

      frameGroup.add(outer, inner);

      const glow = new THREE.PointLight(0xffd27a, 0.25, 6);
      glow.position.set(x, y, z + 0.4);
      frameGroup.add(glow);
    };

    // Left wall frames
    makeFrame(-11.6, 2.2, -4, Math.PI / 2);
    makeFrame(-11.6, 2.2, -9, Math.PI / 2);

    // Right wall frames
    makeFrame(11.6, 2.2, -4, -Math.PI / 2);
    makeFrame(11.6, 2.2, -9, -Math.PI / 2);

    scene.add(frameGroup);
  },

  buildFurniture(scene) {
    const grp = new THREE.Group();
    grp.name = "Furniture";

    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 0.95 });
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0x6b5526, roughness: 0.45, metalness: 0.35 });

    const makeSofa = (x, z, rotY) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 0.9), sofaMat);
      base.position.set(x, 0.28, z);
      base.rotation.y = rotY;

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.18), sofaMat);
      back.position.set(x, 0.8, z - 0.36);
      back.rotation.y = rotY;

      const trim = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.08, 0.98), goldTrim);
      trim.position.set(x, 0.55, z);
      trim.rotation.y = rotY;

      grp.add(base, back, trim);
    };

    makeSofa(-6.8, 6.5, 0);
    makeSofa( 6.8, 6.5, 0);

    // Small side tables
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.8, metalness: 0.1 });
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.55, 22), sideMat);
    t1.position.set(-3.3, 0.28, 6.6);
    grp.add(t1);

    const t2 = t1.clone();
    t2.position.set(3.3, 0.28, 6.6);
    grp.add(t2);

    scene.add(grp);
  },

  buildLeaderboard(scene) {
    // “Glassy black screen” with neon border
    const group = new THREE.Group();
    group.name = "Leaderboard";
    group.position.set(0, 2.8, -13.8);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 3.2),
      new THREE.MeshStandardMaterial({
        color: 0x050507,
        roughness: 0.15,
        metalness: 0.35,
        emissive: 0x000000,
        emissiveIntensity: 0.2
      })
    );

    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(9.4, 3.4),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.16 })
    );
    border.position.z = -0.001;

    // Canvas text
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const txt = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 3.2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    txt.position.z = 0.002;

    group.add(panel, border, txt);
    scene.add(group);

    // Store references for updates
    group.userData.canvas = canvas;
    group.userData.ctx = ctx;
    group.userData.tex = tex;

    this._leaderboard = group;
    this.renderLeaderboard([
      "Boss Tournament — Top 10",
      "♠ King of Spades",
      "♠ Queen of Spades",
      "♠ Jack of Spades",
      "♠ Ace of Spades",
      "Next: add other suits (♥ ♦ ♣)"
    ]);
  },

  renderLeaderboard(lines) {
    if (!this._leaderboard) return;
    const { ctx, canvas, tex } = this._leaderboard.userData;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // glassy black
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // header
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#00ffaa";
    ctx.fillText(lines[0] || "Boss Tournament", 40, 72);

    // list
    ctx.font = "bold 44px Arial";
    const palette = ["#ffd27a", "#ff2bd6", "#2bd7ff", "#ffffff", "#b9ff2b", "#ff6b2b"];
    let y = 140;

    for (let i = 1; i < lines.length; i++) {
      ctx.fillStyle = palette[(i - 1) % palette.length];
      ctx.fillText(lines[i], 60, y);
      y += 50;
    }

    tex.needsUpdate = true;
  },

  async build(scene, rig, camera) {
    if (this.built) return;
    this.built = true;

    this.buildLobbyShell(scene);

    // Place poker table more centered (not in wall)
    this.sim = new PokerSimulation({
      tableCenter: new THREE.Vector3(0, 0, -4.5),
      camera,
      onLeaderboard: (lines) => this.renderLeaderboard(lines),
    });

    await this.sim.build(scene);
  },

  update(dt, camera) {
    // Keep player inside room bounds (soft collision)
    // You asked: “I don’t want to walk into anything.”
    // This is the simplest reliable method without a full physics engine.
    if (camera?.parent) {
      const rig = camera.parent;
      rig.position.x = THREE.MathUtils.clamp(rig.position.x, this.room.minX + 0.6, this.room.maxX - 0.6);
      rig.position.z = THREE.MathUtils.clamp(rig.position.z, this.room.minZ + 0.6, this.room.maxZ - 0.6);
      rig.position.y = 0;
    }

    if (this.sim) this.sim.update(dt);
  }
};
