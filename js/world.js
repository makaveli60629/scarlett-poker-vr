// /js/world.js — Update 9.0
// Builds the casino room, textures, rails, colliders, teleport pad + neon rings.
// Uses your texture filenames from /assets/textures/
//
// IMPORTANT: imports local "./three.js" for GitHub Pages stability.
import * as THREE from "./three.js";

export const World = {
  textureLoader: new THREE.TextureLoader(),

  // exported refs
  colliders: [],
  bounds: null,
  teleport: null,
  tableCenter: new THREE.Vector3(0, 0, -4.6),
  spawn: null,

  // helper: safe texture material with tiling repeat
  texMat(file, { color = 0xffffff, repeatX = 1, repeatY = 1, roughness = 0.9, metalness = 0.05 } = {}) {
    const path = `assets/textures/${file}`;
    const tex = this.textureLoader.load(
      path,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeatX, repeatY);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.needsUpdate = true;
      },
      undefined,
      () => console.warn(`[World] Missing texture: ${path} (fallback color used)`)
    );

    return new THREE.MeshStandardMaterial({
      map: tex || null,
      color,
      roughness,
      metalness
    });
  },

  build(scene) {
    this.colliders = [];

    // Background / fog
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 10, 40);

    // Room size
    const roomW = 22;
    const roomD = 26;
    const wallH = 6.6;

    this.bounds = {
      minX: -roomW/2 + 0.8,
      maxX:  roomW/2 - 0.8,
      minZ: -roomD/2 + 0.8,
      maxZ:  roomD/2 - 0.8
    };

    // Lights (BRIGHTER so artwork isn't dark)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.85);
    hemi.position.set(0, 8, 0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(6, 10, 6);
    key.castShadow = false;
    scene.add(key);

    const warm = new THREE.PointLight(0xffd27a, 0.9, 28);
    warm.position.set(0, 4.0, -4.0);
    scene.add(warm);

    // Floor (marble gold)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      this.texMat("Marblegold floors.jpg", { repeatX: 5, repeatY: 6, roughness: 0.85, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Ceiling dome texture (optional, subtle)
    const ceiling = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 18, 0, Math.PI * 2, 0, Math.PI/2.2),
      this.texMat("ceiling_dome_main.jpg", { repeatX: 2, repeatY: 1, roughness: 0.95, metalness: 0.0 })
    );
    ceiling.position.set(0, wallH, 0);
    scene.add(ceiling);

    // Walls (brick but “smaller bricks” via higher repeat)
    const wallMat = this.texMat("brickwall.jpg", {
      repeatX: 10,   // <- smaller bricks
      repeatY: 4,
      roughness: 0.95,
      metalness: 0.0
    });

    const wallGeo = new THREE.PlaneGeometry(roomW, wallH);
    const back = new THREE.Mesh(wallGeo, wallMat);
    back.position.set(0, wallH/2, -roomD/2);
    scene.add(back);

    const front = new THREE.Mesh(wallGeo, wallMat);
    front.position.set(0, wallH/2, roomD/2);
    front.rotation.y = Math.PI;
    scene.add(front);

    const sideGeo = new THREE.PlaneGeometry(roomD, wallH);
    const left = new THREE.Mesh(sideGeo, wallMat);
    left.position.set(-roomW/2, wallH/2, 0);
    left.rotation.y = Math.PI/2;
    scene.add(left);

    const right = new THREE.Mesh(sideGeo, wallMat);
    right.position.set(roomW/2, wallH/2, 0);
    right.rotation.y = -Math.PI/2;
    scene.add(right);

    // Gold trim around bottom of walls
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a, roughness: 0.35, metalness: 0.45, emissive: 0x332200, emissiveIntensity: 0.15
    });

    const trimH = 0.22, trimT = 0.12;
    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(roomW, trimH, trimT), trimMat);
    trim1.position.set(0, trimH/2, -roomD/2 + trimT/2);
    scene.add(trim1);

    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(roomW, trimH, trimT), trimMat);
    trim2.position.set(0, trimH/2, roomD/2 - trimT/2);
    scene.add(trim2);

    const trim3 = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, roomD), trimMat);
    trim3.position.set(-roomW/2 + trimT/2, trimH/2, 0);
    scene.add(trim3);

    const trim4 = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, roomD), trimMat);
    trim4.position.set(roomW/2 - trimT/2, trimH/2, 0);
    scene.add(trim4);

    // Pillars (corners)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe9e9ee, roughness: 0.85, metalness: 0.05 });
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.4, wallH, 18);

    const pillars = [
      [-roomW/2 + 0.65, wallH/2, -roomD/2 + 0.65],
      [ roomW/2 - 0.65, wallH/2, -roomD/2 + 0.65],
      [-roomW/2 + 0.65, wallH/2,  roomD/2 - 0.65],
      [ roomW/2 - 0.65, wallH/2,  roomD/2 - 0.65],
    ];
    for (const [x,y,z] of pillars) {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x,y,z);
      scene.add(p);
    }

    // Casino art frames (simple, bright)
    this._addArt(scene, { x: -6.4, y: 2.7, z: -roomD/2 + 0.03, file: "casino_art.jpg" });
    this._addArt(scene, { x:  6.4, y: 2.7, z: -roomD/2 + 0.03, file: "Casinoart2.jpg" });

    // Brand logo behind leaderboard
    this._addArt(scene, { x: 0, y: 4.7, z: -roomD/2 + 0.03, file: "brand_logo.jpg", w: 3.2, h: 1.4 });

    // Leaderboard anchor position (UI will render its own screen, we just give it a bright light)
    const lbLight = new THREE.PointLight(0x2bd7ff, 0.75, 14);
    lbLight.position.set(0, 4.8, -roomD/2 + 1.3);
    scene.add(lbLight);

    // Main table (centerpiece) — felt + leather trim
    this._buildMainTable(scene);

    // Rails around table (collidable)
    this._buildRails(scene);

    // Water fountain near entrance
    this._buildFountain(scene);

    // Teleport machine (spawn source) + 3 neon rings target
    this._buildTeleport(scene);

    // Colliders: walls + rails + table base
    this._buildColliders(roomW, roomD, wallH);

    // Spawn from teleport machine (always)
    this.spawn = this.getSafeSpawn();

    return {
      colliders: this.colliders,
      bounds: this.bounds,
      teleport: this.teleport,
      spawn: this.spawn,
      tableCenter: this.tableCenter
    };
  },

  _addArt(scene, { x, y, z, file, w = 2.2, h = 1.25 }) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.35, metalness: 0.45 })
    );
    frame.position.set(x, y, z + 0.03);
    scene.add(frame);

    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      this.texMat(file, { repeatX: 1, repeatY: 1, roughness: 0.9 })
    );
    art.position.set(x, y, z + 0.061);
    scene.add(art);

    const glow = new THREE.PointLight(0xffd27a, 0.35, 8);
    glow.position.set(x, y, z + 1.2);
    scene.add(glow);
  },

  _buildMainTable(scene) {
    const g = new THREE.Group();
    g.name = "MainTable";
    g.position.copy(this.tableCenter);

    const felt = this.texMat("table_felt_green.jpg", { repeatX: 2, repeatY: 2, roughness: 0.95, metalness: 0.0 });
    const leather = this.texMat("Table leather trim.jpg", { repeatX: 2, repeatY: 1, roughness: 0.65, metalness: 0.15 });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.40, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.92, metalness: 0.05 })
    );
    base.position.y = 0.38;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.15, 3.25, 0.24, 48),
      felt
    );
    top.position.y = 1.08;

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(3.02, 0.15, 18, 90),
      leather
    );
    trim.rotation.x = Math.PI/2;
    trim.position.y = 1.12;

    const line = new THREE.Mesh(
      new THREE.TorusGeometry(2.20, 0.05, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.75,
        roughness: 0.35
      })
    );
    line.rotation.x = Math.PI/2;
    line.position.y = 1.12;

    g.add(base, top, trim, line);
    scene.add(g);

    // collider for table base (prevents walking through)
    this._addAABBFromCenter(g.position.x, 0, g.position.z, 3.6, 2.2);
  },

  _buildRails(scene) {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x15151b, roughness: 0.7, metalness: 0.25, emissive: 0x000000
    });

    const railGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a, emissive: 0xffd27a, emissiveIntensity: 0.65, roughness: 0.35, metalness: 0.35
    });

    const cx = this.tableCenter.x;
    const cz = this.tableCenter.z;

    const halfW = 6.2;
    const halfD = 5.4;
    const railH = 0.85;
    const thick = 0.22;

    // 4 rails
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(halfW*2, railH, thick), railMat);
    r1.position.set(cx, railH/2, cz - halfD);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(halfW*2, railH, thick), railMat);
    r2.position.set(cx, railH/2, cz + halfD);
    const r3 = new THREE.Mesh(new THREE.BoxGeometry(thick, railH, halfD*2), railMat);
    r3.position.set(cx - halfW, railH/2, cz);
    const r4 = new THREE.Mesh(new THREE.BoxGeometry(thick, railH, halfD*2), railMat);
    r4.position.set(cx + halfW, railH/2, cz);

    // glow strips
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(halfW*2, 0.06, 0.08), railGlowMat);
    g1.position.set(cx, railH + 0.02, cz - halfD);
    const g2 = g1.clone(); g2.position.set(cx, railH + 0.02, cz + halfD);
    const g3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, halfD*2), railGlowMat);
    g3.position.set(cx - halfW, railH + 0.02, cz);
    const g4 = g3.clone(); g4.position.set(cx + halfW, railH + 0.02, cz);

    scene.add(r1,r2,r3,r4,g1,g2,g3,g4);

    // colliders for rails
    this._addAABBFromMesh(r1);
    this._addAABBFromMesh(r2);
    this._addAABBFromMesh(r3);
    this._addAABBFromMesh(r4);
  },

  _buildFountain(scene) {
    const g = new THREE.Group();
    g.name = "Fountain";
    g.position.set(-6.5, 0, 7.5);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.2, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: 0xe9e9ee, roughness: 0.85 })
    );
    bowl.position.y = 0.23;

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.55 })
    );
    water.position.y = 0.40;

    const spout = new THREE.PointLight(0x2bd7ff, 0.55, 8);
    spout.position.set(0, 1.2, 0);

    g.add(bowl, water, spout);
    scene.add(g);

    // collider
    this._addAABBFromCenter(g.position.x, 0, g.position.z, 1.6, 1.6);
  },

  _buildTeleport(scene) {
    const padCenter = new THREE.Vector3(0, 0, 6.8);

    const group = new THREE.Group();
    group.name = "TeleportMachine";
    group.position.copy(padCenter);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.78, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9 })
    );
    base.position.y = 0.07;

    const glowTex = this.texMat("Teleport glow.jpg", { repeatX: 1, repeatY: 1, roughness: 0.35, metalness: 0.15 });
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.05, 12, 48),
      glowTex
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.14;

    const beacon = new THREE.PointLight(0x00ffaa, 0.65, 10);
    beacon.position.set(0, 1.7, 0);

    group.add(base, glow, beacon);
    scene.add(group);

    // teleport target rings (3 neon circles)
    const rings = new THREE.Group();
    rings.name = "TeleportRings";
    rings.visible = false;

    const ringMat1 = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.6, roughness: 0.35 });
    const ringMat2 = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, emissive: 0x2bd7ff, emissiveIntensity: 1.4, roughness: 0.35 });
    const ringMat3 = new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 1.4, roughness: 0.35 });

    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.018, 10, 48), ringMat1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.016, 10, 48), ringMat2);
    const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 10, 48), ringMat3);

    r1.rotation.x = r2.rotation.x = r3.rotation.x = Math.PI/2;

    rings.add(r1,r2,r3);
    scene.add(rings);

    this.teleport = { pad: group, rings, padCenter };

    // collider so you can’t clip into the machine
    this._addAABBFromCenter(padCenter.x, 0, padCenter.z, 1.4, 1.4);
  },

  _buildColliders(roomW, roomD, wallH) {
    // Wall colliders (thin)
    const t = 0.35;

    // back wall
    this._addAABB({
      min: new THREE.Vector3(-roomW/2, 0, -roomD/2 - t),
      max: new THREE.Vector3( roomW/2, wallH, -roomD/2 + t)
    });
    // front wall
    this._addAABB({
      min: new THREE.Vector3(-roomW/2, 0, roomD/2 - t),
      max: new THREE.Vector3( roomW/2, wallH, roomD/2 + t)
    });
    // left wall
    this._addAABB({
      min: new THREE.Vector3(-roomW/2 - t, 0, -roomD/2),
      max: new THREE.Vector3(-roomW/2 + t, wallH, roomD/2)
    });
    // right wall
    this._addAABB({
      min: new THREE.Vector3(roomW/2 - t, 0, -roomD/2),
      max: new THREE.Vector3(roomW/2 + t, wallH, roomD/2)
    });
  },

  _addAABB(box) {
    this.colliders.push(box);
  },

  _addAABBFromMesh(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    this._addAABB({ min: box.min.clone(), max: box.max.clone() });
  },

  _addAABBFromCenter(cx, cy, cz, sizeX, sizeZ) {
    // ground-level blocker
    this._addAABB({
      min: new THREE.Vector3(cx - sizeX/2, 0, cz - sizeZ/2),
      max: new THREE.Vector3(cx + sizeX/2, 2.5, cz + sizeZ/2)
    });
  },

  getSafeSpawn() {
    // Spawn directly at teleport pad, offset forward, facing into room
    if (!this.teleport) return { position: new THREE.Vector3(0, 0, 6.5), yaw: Math.PI };
    const p = this.teleport.padCenter;
    return {
      position: new THREE.Vector3(p.x, 0, p.z + 1.25),
      yaw: Math.PI
    };
  }
};
