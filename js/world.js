import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  group: null,
  colliders: [],
  leaderboardMesh: null,

  build(scene, textureLoader) {
    this.group = new THREE.Group();
    scene.add(this.group);

    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.Fog(0x07080b, 6, 55);

    // --- FLOOR ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 24),
      new THREE.MeshStandardMaterial({ color: 0x111014, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Carpet zone (red)
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 14),
      new THREE.MeshStandardMaterial({ color: 0x3a0d18, roughness: 0.95 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    this.group.add(carpet);

    // --- WALLS (SOLID) ---
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3b, roughness: 0.9 });
    const mkWall = (w, h, x, z, ry) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.28), wallMat);
      wall.position.set(x, h / 2, z);
      wall.rotation.y = ry;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.collider = true;
      this.group.add(wall);
      this.colliders.push(wall);
    };

    mkWall(34, 3.3, 0, -12, 0);
    mkWall(34, 3.3, 0,  12, 0);
    mkWall(24, 3.3, -17, 0, Math.PI / 2);
    mkWall(24, 3.3,  17, 0, Math.PI / 2);

    // --- CEILING (fix “black void”) ---
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 24),
      new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 1.0, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.35;
    this.group.add(ceiling);

    // --- LIGHTING (BRIGHTER) ---
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 10, 6);
    dir.castShadow = true;
    scene.add(dir);

    const p1 = new THREE.PointLight(0x88bbff, 0.9, 40);
    p1.position.set(-6, 2.4, 0);
    scene.add(p1);

    const p2 = new THREE.PointLight(0xff88aa, 0.6, 35);
    p2.position.set(6, 2.4, 0);
    scene.add(p2);

    // Neon strips (visual polish)
    const neonMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066aa, emissiveIntensity: 1.4 });
    const mkNeon = (x, z, ry) => {
      const n = new THREE.Mesh(new THREE.BoxGeometry(10, 0.08, 0.08), neonMat);
      n.position.set(x, 2.95, z);
      n.rotation.y = ry;
      this.group.add(n);
    };
    mkNeon(-7, -11.6, 0);
    mkNeon( 7, -11.6, 0);
    mkNeon(-7,  11.6, 0);
    mkNeon( 7,  11.6, 0);

    // --- ART FRAMES (placeholder black if missing textures) ---
    const addArt = (file, x, y, z, ry) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 1.5, 0.10),
        new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.6, metalness: 0.2 })
      );
      frame.position.set(x, y, z);
      frame.rotation.y = ry;
      this.group.add(frame);

      try {
        const tex = textureLoader.load(`./assets/textures/${file}`);
        const art = new THREE.Mesh(
          new THREE.PlaneGeometry(2.05, 1.25),
          new THREE.MeshStandardMaterial({ map: tex })
        );
        art.position.set(x, y, z + 0.06);
        art.rotation.y = ry;
        this.group.add(art);
      } catch {}
    };

    addArt("casino_art_1.jpg", -16.7, 1.6, -4, Math.PI / 2);
    addArt("casino_art_2.jpg", -16.7, 1.6,  4, Math.PI / 2);

    // --- FURNITURE (simple low-poly placeholders) ---
    this._addFurniture();

    // --- LEADERBOARD BOARD ---
    this.leaderboardMesh = this._makeLeaderboard();
    this.leaderboardMesh.position.set(0, 1.6, -11.5);
    this.group.add(this.leaderboardMesh);

    return this.group;
  },

  _addFurniture() {
    // Sofa set (boxes)
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x141419, roughness: 0.95 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, metalness: 0.75, roughness: 0.25 });

    const mkSofa = (x, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.85), sofaMat);
      base.position.y = 0.22;
      base.castShadow = true;
      base.receiveShadow = true;
      base.userData.collider = true;
      g.add(base);
      this.colliders.push(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.22), sofaMat);
      back.position.set(0, 0.70, -0.33);
      back.castShadow = true;
      back.userData.collider = true;
      g.add(back);
      this.colliders.push(back);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 0.90), goldMat);
      trim.position.y = 0.49;
      g.add(trim);

      this.group.add(g);
    };

    mkSofa(10, 6, Math.PI);
    mkSofa(10, -6, Math.PI);

    // Plants
    const potMat = new THREE.MeshStandardMaterial({ color: 0x3b1f12, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d6b35, roughness: 0.9 });

    const mkPlant = (x, z) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.30, 0.35, 16), potMat);
      pot.position.set(x, 0.18, z);
      pot.castShadow = true;
      pot.userData.collider = true;
      this.group.add(pot);
      this.colliders.push(pot);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 18), leafMat);
      leaf.position.set(x, 0.78, z);
      leaf.castShadow = true;
      this.group.add(leaf);
    };

    mkPlant(-10, 8);
    mkPlant(-10, -8);
    mkPlant(14, 8);
    mkPlant(14, -8);
  },

  _makeLeaderboard() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "rgba(201,162,77,0.8)";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, c.width - 40, c.height - 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 66px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SHOWDOWN LEADERBOARD", c.width / 2, 90);

    ctx.font = "bold 44px system-ui";
    ctx.textAlign = "left";

    const rows = [
      "1. NovaBot — 120,000 pts",
      "2. StackKing — 98,500 pts",
      "3. LuckyAce — 90,100 pts",
      "4. RiverRat — 71,000 pts",
      "5. DealerDan — 64,300 pts",
    ];

    // Elegant red accent
    ctx.fillStyle = "rgba(255,80,90,0.95)";
    rows.forEach((r, i) => ctx.fillText(r, 90, 170 + i * 62));

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "36px system-ui";
    ctx.fillText("Ends Sunday Night • Top 10 earn prizes", 90, 480);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });

    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), mat);
    board.castShadow = true;
    return board;
  }
};
