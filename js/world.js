import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Table } from './table.js';
import { Store } from './store.js';

export const World = {
  textureLoader: new THREE.TextureLoader(),

  R: { teleportables: [], colliders: [], interactables: [] },

  getRuntime() { return this.R; },

  safeTexture(path, repeatX = 1, repeatY = 1) {
    const tex = this.textureLoader.load(
      path,
      () => { tex.userData.ok = true; tex.needsUpdate = true; },
      undefined,
      () => { tex.userData.ok = false; }
    );
    tex.userData.ok = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  },

  matStd(path, fallbackColor, repeatX = 1, repeatY = 1, rough = 0.9, metal = 0.0) {
    const map = this.safeTexture(path, repeatX, repeatY);
    return new THREE.MeshStandardMaterial({ map, color: fallbackColor, roughness: rough, metalness: metal });
  },

  matBasic(path, fallbackColor = 0xffffff, transparent = false, opacity = 1.0) {
    const map = this.safeTexture(path, 1, 1);
    return new THREE.MeshBasicMaterial({ map, color: fallbackColor, transparent, opacity });
  },

  // Precise AABB helper (NO boundingBox math bugs)
  aabbFromBox(centerX, centerY, centerZ, sizeX, sizeY, sizeZ) {
    return {
      type: 'aabb',
      min: new THREE.Vector3(centerX - sizeX/2, centerY - sizeY/2, centerZ - sizeZ/2),
      max: new THREE.Vector3(centerX + sizeX/2, centerY + sizeY/2, centerZ + sizeZ/2)
    };
  },

  addInteractable(mesh, onClick) {
    mesh.userData.interactable = true;
    mesh.userData.onClick = onClick;
    this.R.interactables.push(mesh);
  },

  build(scene) {
    this.R.teleportables = [];
    this.R.colliders = [];
    this.R.interactables = [];

    // Lighting
    scene.background = new THREE.Color(0x0b0b12);
    scene.add(new THREE.AmbientLight(0xffffff, 1.10));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(10, 18, 8);
    scene.add(sun);

    const fill = new THREE.PointLight(0xffffff, 1.15, 180);
    fill.position.set(0, 10, 0);
    scene.add(fill);

    // Materials from your folder
    const M = {
      lobbyCarpet: this.matStd('assets/textures/lobby_carpet.jpg', 0x552222, 6, 6, 1.0, 0.0),
      marbleGold: this.matStd('assets/textures/Marblegold floors.jpg', 0x3a3a3a, 4, 4, 0.35, 0.35),
      brick: this.matStd('assets/textures/brickwall.jpg', 0x666666, 3, 2, 1.0, 0.0),
      runes: this.matStd('assets/textures/wall_stone_runes.jpg', 0x555555, 2, 2, 0.95, 0.0),
      dome: this.matStd('assets/textures/ceiling_dome_main.jpg', 0x222233, 2, 2, 0.95, 0.0),

      art1: this.matBasic('assets/textures/casino_art.jpg'),
      art2: this.matBasic('assets/textures/Casinoart2.jpg'),
      scorpion: this.matBasic('assets/textures/Scoripon room brand.jpg'),

      teleport: this.matBasic('assets/textures/Teleport glow.jpg', 0xffffff, true, 0.9)
    };

    // Main floor (teleportable)
    this.addTeleportFloor(scene, 0, 0, 90, 90, M.marbleGold);

    // Lobby carpet area (visual + teleportable)
    this.addTeleportFloor(scene, 0, 42, 54, 38, M.lobbyCarpet);

    // Vault/side area (teleportable)
    this.addTeleportFloor(scene, -48, 6, 38, 38, M.marbleGold);

    // ---- SOLID WALL SYSTEM (THICK BOX WALLS + PERFECT COLLIDERS) ----
    // We build 3 rooms as closed rectangles (no accidental gaps).
    this.buildSolidRoom(scene, 0, 0, 70, 10, 1.0, M.brick);      // Main
    this.buildSolidRoom(scene, 0, 42, 52, 10, 1.0, M.brick);     // Lobby
    this.buildSolidRoom(scene, -48, 6, 36, 10, 1.0, M.brick);    // Vault

    // Rune wall accent
    const runeWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), M.runes);
    runeWall.position.set(0, 4, -18);
    scene.add(runeWall);

    // Dome ceiling (visual only)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(45, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      M.dome
    );
    dome.position.set(0, 0, 0);
    dome.rotation.x = Math.PI;
    scene.add(dome);

    // Posters
    this.addPoster(scene, -12, 4.6, 50.8, M.art1, 9, 5);
    this.addPoster(scene,  12, 4.6, 50.8, M.art2, 9, 5);
    this.addPoster(scene, 0, 4.6, -24.5, M.scorpion, 11, 6);

    // Teleport pads
    this.addTeleportPad(scene, 0, 10, M.teleport);
    this.addTeleportPad(scene, 0, 42, M.teleport);
    this.addTeleportPad(scene, -48, 6, M.teleport);

    // Table + chairs
    const t = Table.createTable(scene, 0, 0);
    this.R.colliders.push(t.collider);
    Table.createChairs(scene, 0, 0);

    // Store kiosk with clickable chip buttons
    this.addStoreKiosk(scene, 18, 42);

    // Spawn ring
    const spawnRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.position.set(0, 0.02, 10);
    scene.add(spawnRing);
  },

  // Builds a thick, solid box-room with colliders that match exactly.
  buildSolidRoom(scene, cx, cz, size, height, thickness, mat) {
    const half = size / 2;
    const h = height;

    // North wall
    const n = new THREE.Mesh(new THREE.BoxGeometry(size, h, thickness), mat);
    n.position.set(cx, h/2, cz - half);
    scene.add(n);
    this.R.colliders.push(this.aabbFromBox(n.position.x, n.position.y, n.position.z, size, h, thickness));

    // South wall
    const s = n.clone();
    s.position.set(cx, h/2, cz + half);
    scene.add(s);
    this.R.colliders.push(this.aabbFromBox(s.position.x, s.position.y, s.position.z, size, h, thickness));

    // West wall
    const w = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, size), mat);
    w.position.set(cx - half, h/2, cz);
    scene.add(w);
    this.R.colliders.push(this.aabbFromBox(w.position.x, w.position.y, w.position.z, thickness, h, size));

    // East wall
    const e = w.clone();
    e.position.set(cx + half, h/2, cz);
    scene.add(e);
    this.R.colliders.push(this.aabbFromBox(e.position.x, e.position.y, e.position.z, thickness, h, size));
  },

  addTeleportFloor(scene, x, z, w, d, mat) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    floor.userData.teleportable = true;
    scene.add(floor);
    this.R.teleportables.push(floor);
    return floor;
  },

  addTeleportPad(scene, x, z, mat) {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), mat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.02, z);
    pad.userData.teleportable = true;
    scene.add(pad);
    this.R.teleportables.push(pad);
    return pad;
  },

  addPoster(scene, x, y, z, mat, w = 6, h = 4) {
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    poster.position.set(x, y, z);
    poster.rotation.y = (z > 0) ? Math.PI : 0;
    scene.add(poster);
  },

  addStoreKiosk(scene, x, z) {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.2, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.9 })
    );
    stand.position.set(x, 0.6, z);
    scene.add(stand);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 1.4),
      new THREE.MeshBasicMaterial({ color: 0x00ffd5, transparent: true, opacity: 0.85 })
    );
    sign.position.set(x, 2.1, z + 0.72);
    scene.add(sign);

    const chip1000  = this.matBasic('assets/textures/chip_1000.jpg', 0xffffff, true, 0.95);
    const chip5000  = this.matBasic('assets/textures/chip_5000.jpg', 0xffffff, true, 0.95);
    const chip10000 = this.matBasic('assets/textures/chip_10000.jpg', 0xffffff, true, 0.95);

    const mkButton = (mat, bx, by, bz, id) => {
      const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.65), mat);
      btn.position.set(bx, by, bz);
      btn.rotation.y = Math.PI;
      scene.add(btn);
      this.addInteractable(btn, () => Store.buy(id));
      return btn;
    };

    mkButton(chip1000,  x - 0.75, 1.25, z + 0.75, "chips_1000");
    mkButton(chip5000,  x,        1.25, z + 0.75, "chips_5000");
    mkButton(chip10000, x + 0.75, 1.25, z + 0.75, "chips_10000");
  }
};
