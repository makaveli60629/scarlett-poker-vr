import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Table } from './table.js';

export const World = {
  textureLoader: new THREE.TextureLoader(),

  // =========================
  // PERFORMANCE / QUALITY TOGGLES
  // =========================
  CFG: {
    enableCeilingDome: true,
    enablePosters: true,
    enableWinnerStation: true,
    enableDailyClaim: true,
    enableChipProps: true,
    enableTeleportPads: true,

    wallHeight: 10,
    mainRoomSize: 70,
    lobbyRoomSize: 52,
    sideRoomSize: 36
  },

  // Safe texture loader: never crashes if missing
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
    return new THREE.MeshStandardMaterial({
      map,
      color: fallbackColor,
      roughness: rough,
      metalness: metal
    });
  },

  matBasic(path, fallbackColor = 0xffffff, transparent = false, opacity = 1.0) {
    const map = this.safeTexture(path, 1, 1);
    return new THREE.MeshBasicMaterial({ map, color: fallbackColor, transparent, opacity });
  },

  build(scene) {
    // =========================
    // 1) LIGHTING (bright, readable)
    // =========================
    scene.background = new THREE.Color(0x0b0b12);
    scene.add(new THREE.AmbientLight(0xffffff, 1.10));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(10, 18, 8);
    scene.add(sun);

    const fill = new THREE.PointLight(0xffffff, 1.15, 160);
    fill.position.set(0, 10, 0);
    scene.add(fill);

    // =========================
    // 2) MATERIALS (your texture list)
    // =========================
    const M = {
      // floors
      lobbyCarpet: this.matStd('assets/textures/lobby_carpet.jpg', 0x552222, 6, 6, 1.0, 0.0),
      marbleGold: this.matStd('assets/textures/Marblegold floors.jpg', 0x3a3a3a, 4, 4, 0.35, 0.35),

      // walls / feature
      brick: this.matStd('assets/textures/brickwall.jpg', 0x666666, 3, 2, 1.0, 0.0),
      runes: this.matStd('assets/textures/wall_stone_runes.jpg', 0x555555, 2, 2, 0.95, 0.0),

      // ceiling
      dome: this.matStd('assets/textures/ceiling_dome_main.jpg', 0x222233, 2, 2, 0.95, 0.0),

      // posters / panels
      art1: this.matBasic('assets/textures/casino_art.jpg'),
      art2: this.matBasic('assets/textures/Casinoart2.jpg'),
      scorpion: this.matBasic('assets/textures/Scoripon room brand.jpg'),

      // UI station
      holo: this.matBasic('assets/textures/ui_winner_hologram.jpg', 0xffffff, true, 0.85),
      winner: this.matBasic('assets/textures/Winner.jpg', 0xffffff, true, 0.95),

      // daily claim
      dailyClaim: this.matBasic('assets/textures/dailyclaim.jpg', 0xffffff, true, 1.0),

      // teleport glow
      teleport: this.matBasic('assets/textures/Teleport glow.jpg', 0xffffff, true, 0.9),

      // chips (props)
      chip1000: this.matBasic('assets/textures/chip_1000.jpg', 0xffffff, true, 1.0),
      chip5000: this.matBasic('assets/textures/chip_5000.jpg', 0xffffff, true, 1.0),
      chip10000: this.matBasic('assets/textures/chip_10000.jpg', 0xffffff, true, 1.0),
    };

    // =========================
    // 3) ROOMS (3 zones)
    // =========================
    const mainSize = this.CFG.mainRoomSize;
    const lobbySize = this.CFG.lobbyRoomSize;
    const sideSize = this.CFG.sideRoomSize;
    const H = this.CFG.wallHeight;

    // Main room at (0,0)
    this.addFloor(scene, 0, 0, mainSize, mainSize, M.marbleGold);
    this.makeWalls(scene, 0, 0, mainSize, H, M.brick);

    // Lobby in front (0, +42)
    this.addFloor(scene, 0, 42, lobbySize, 38, M.lobbyCarpet);
    this.makeWalls(scene, 0, 42, lobbySize, H, M.brick);

    // Side/VIP room (left)
    this.addFloor(scene, -48, 6, sideSize, sideSize, M.marbleGold);
    this.makeWalls(scene, -48, 6, sideSize, H, M.brick);

    // Open “doorways” (visual guidance; collision comes later)
    this.addDoorFrame(scene, 0, 5, 20, H, M.brick);        // main -> lobby
    this.addDoorFrame(scene, -25, 5, 6, H, M.brick, 'x');  // main -> side

    // Feature rune wall behind table
    const runeWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), M.runes);
    runeWall.position.set(0, 4, -18);
    scene.add(runeWall);

    // =========================
    // 4) CEILING DOME (optional)
    // =========================
    if (this.CFG.enableCeilingDome) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(45, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        M.dome
      );
      dome.position.set(0, 0, 0);
      dome.rotation.x = Math.PI;
      scene.add(dome);
    }

    // =========================
    // 5) TABLE + CHAIRS (center)
    // =========================
    Table.createTable(scene, 0, 0);
    if (typeof Table.createChairs === 'function') Table.createChairs(scene, 0, 0);

    // =========================
    // 6) POSTERS / BRANDING (optional)
    // =========================
    if (this.CFG.enablePosters) {
      this.addPoster(scene, -12, 4.6, 50.8, M.art1, 9, 5);     // lobby back wall
      this.addPoster(scene,  12, 4.6, 50.8, M.art2, 9, 5);
      this.addPoster(scene, 0, 4.6, -24.5, M.scorpion, 11, 6); // main back wall
    }

    // =========================
    // 7) TELEPORT PADS (visual)
    // =========================
    if (this.CFG.enableTeleportPads) {
      this.addTeleportPad(scene, 0, 10, M.teleport);
      this.addTeleportPad(scene, 0, 42, M.teleport);
      this.addTeleportPad(scene, -48, 6, M.teleport);
    }

    // =========================
    // 8) WINNER HOLOGRAM STATION (lobby)
    // =========================
    if (this.CFG.enableWinnerStation) {
      this.addWinnerStation(scene, 0, 42, M.holo, M.winner);
    }

    // =========================
    // 9) DAILY CLAIM KIOSK (lobby)
    // =========================
    if (this.CFG.enableDailyClaim) {
      this.addDailyClaim(scene, 18, 42, M.dailyClaim);
    }

    // =========================
    // 10) CHIP PROPS (main room near table)
    // =========================
    if (this.CFG.enableChipProps) {
      this.addChipStack(scene, 6, 0.05, -2, M.chip1000, 0xffcc66);
      this.addChipStack(scene, 7.2, 0.05, -2, M.chip5000, 0x66ccff);
      this.addChipStack(scene, 8.4, 0.05, -2, M.chip10000, 0xff66cc);
    }

    // Subtle spawn marker ring on floor (helps orientation)
    const spawnMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    spawnMarker.rotation.x = -Math.PI / 2;
    spawnMarker.position.set(0, 0.02, 10);
    scene.add(spawnMarker);
  },

  // =========================
  // HELPERS
  // =========================
  addFloor(scene, x, z, w, d, mat) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    scene.add(floor);
  },

  makeWalls(scene, cx, cz, size, height, mat) {
    const t = 1.0;
    const half = size / 2;

    const back = new THREE.Mesh(new THREE.BoxGeometry(size, height, t), mat);
    back.position.set(cx, height / 2, cz - half);
    scene.add(back);

    const front = back.clone();
    front.position.set(cx, height / 2, cz + half);
    scene.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(t, height, size), mat);
    left.position.set(cx - half, height / 2, cz);
    scene.add(left);

    const right = left.clone();
    right.position.set(cx + half, height / 2, cz);
    scene.add(right);
  },

  addPoster(scene, x, y, z, mat, w = 6, h = 4) {
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    poster.position.set(x, y, z);

    // face inward based on wall direction
    if (Math.abs(z) > Math.abs(x)) poster.rotation.y = (z > 0) ? Math.PI : 0;
    else poster.rotation.y = (x > 0) ? -Math.PI / 2 : Math.PI / 2;

    scene.add(poster);
  },

  addTeleportPad(scene, x, z, mat) {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), mat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.02, z);
    scene.add(pad);
  },

  addWinnerStation(scene, x, z, holoMat, winnerMat) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 })
    );
    base.position.set(x, 0.2, z);
    scene.add(base);

    const holo = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), holoMat);
    holo.position.set(x, 3.0, z);
    holo.rotation.y = Math.PI;
    scene.add(holo);

    const win = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.4), winnerMat);
    win.position.set(x, 2.1, z + 0.02);
    win.rotation.y = Math.PI;
    scene.add(win);
  },

  addDailyClaim(scene, x, z, mat) {
    // small kiosk stand
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.9 })
    );
    stand.position.set(x, 0.6, z);
    scene.add(stand);

    // screen panel
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), mat);
    panel.position.set(x, 2.1, z + 0.62);
    panel.rotation.y = -Math.PI / 2;
    scene.add(panel);
  },

  addChipStack(scene, x, y, z, chipMat, rimColor = 0xffffff) {
    // A simple stack of discs with a texture plane “label”
    const stackMat = new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.7 });
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 20), stackMat);
    stack.position.set(x, y + 0.125, z);
    scene.add(stack);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), chipMat);
    label.position.set(x, y + 0.26, z);
    label.rotation.x = -Math.PI / 2;
    scene.add(label);
  },

  addDoorFrame(scene, x, yCenter, z, wallHeight, mat, axis = 'z') {
    // A visual doorway marker (no real cut-out yet)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.9 });
    const w = 6;
    const h = 7;

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), frameMat);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.5), frameMat);

    if (axis === 'z') {
      left.position.set(x - w / 2, h / 2, z);
      right.position.set(x + w / 2, h / 2, z);
      top.position.set(x, h, z);
    } else {
      // axis x
      left.position.set(x, h / 2, z - w / 2);
      right.position.set(x, h / 2, z + w / 2);
      top.position.set(x, h, z);
      top.rotation.y = Math.PI / 2;
    }

    scene.add(left);
    scene.add(right);
    scene.add(top);
  }
};
