import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Table } from './table.js';

export const World = {
  textureLoader: new THREE.TextureLoader(),

  // Safe texture that never crashes your build if missing
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
    return new THREE.MeshBasicMaterial({
      map,
      color: fallbackColor,
      transparent,
      opacity
    });
  },

  build(scene) {
    // =========================
    // 1) LIGHTING (bright + readable)
    // =========================
    scene.background = new THREE.Color(0x0b0b12);
    scene.add(new THREE.AmbientLight(0xffffff, 1.15));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(10, 18, 8);
    scene.add(sun);

    const fill = new THREE.PointLight(0xffffff, 1.1, 140);
    fill.position.set(0, 10, 0);
    scene.add(fill);

    // =========================
    // 2) MATERIALS (your textures)
    // =========================
    const M = {
      // floors
      lobbyCarpet: this.matStd('assets/textures/lobby_carpet.jpg', 0x552222, 6, 6, 1.0, 0.0),
      marbleGold: this.matStd('assets/textures/Marblegold floors.jpg', 0x3a3a3a, 4, 4, 0.35, 0.35),

      // walls / ceiling
      brick: this.matStd('assets/textures/brickwall.jpg', 0x666666, 3, 2, 1.0, 0.0),
      runes: this.matStd('assets/textures/wall_stone_runes.jpg', 0x555555, 2, 2, 0.95, 0.0),
      dome: this.matStd('assets/textures/ceiling_dome_main.jpg', 0x222233, 2, 2, 0.95, 0.0),

      // posters / panels (vivid)
      art1: this.matBasic('assets/textures/casino_art.jpg'),
      art2: this.matBasic('assets/textures/Casinoart2.jpg'),
      scorpion: this.matBasic('assets/textures/Scoripon room brand.jpg'),

      // teleport pad glow
      teleportGlow: this.matBasic('assets/textures/Teleport glow.jpg', 0xffffff, true, 0.95),

      // winner hologram
      winnerHolo: this.matBasic('assets/textures/ui_winner_hologram.jpg', 0xffffff, true, 0.9),
      winnerText: this.matBasic('assets/textures/Winner.jpg', 0xffffff, true, 0.95),

      // decor
      crown: this.matBasic('assets/textures/Crown.jpg', 0xffffff, true, 1.0),
      dailyClaim: this.matBasic('assets/textures/dailyclaim.jpg', 0xffffff, true, 1.0),
    };

    // =========================
    // 3) LAYOUT: Main room + lobby + side room
    // =========================

    // MAIN ROOM floor (center)
    const mainFloor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), M.marbleGold);
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.set(0, 0, 0);
    scene.add(mainFloor);

    // LOBBY floor (front)
    const lobbyFloor = new THREE.Mesh(new THREE.PlaneGeometry(52, 38), M.lobbyCarpet);
    lobbyFloor.rotation.x = -Math.PI / 2;
    lobbyFloor.position.set(0, 0, 42);
    scene.add(lobbyFloor);

    // SIDE ROOM floor (left)
    const sideFloor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), M.marbleGold);
    sideFloor.rotation.x = -Math.PI / 2;
    sideFloor.position.set(-48, 0, 6);
    scene.add(sideFloor);

    // Walls: Main room box
    this.makeWalls(scene, 0, 0, 70, 10, M.brick);
    // Walls: Lobby box
    this.makeWalls(scene, 0, 42, 52, 10, M.brick);
    // Walls: Side room box
    this.makeWalls(scene, -48, 6, 36, 10, M.brick);

    // Feature rune wall behind table (main room)
    const runeWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), M.runes);
    runeWall.position.set(0, 4, -18);
    scene.add(runeWall);

    // Ceiling dome centered over main room
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(45, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      M.dome
    );
    dome.position.set(0, 0, 0);
    dome.rotation.x = Math.PI; // flip so texture faces down-ish
    scene.add(dome);

    // =========================
    // 4) TABLE (center of main room)
    // =========================
    Table.createTable(scene, 0, 0);
    // Chairs still from Table.createChairs if you want them; if not, remove line:
    Table.createChairs?.(scene, 0, 0);

    // =========================
    // 5) POSTERS / ART (lobby + main)
    // =========================
    this.addPoster(scene, -12, 4.5, 50.8, M.art1, 9, 5);
    this.addPoster(scene,  12, 4.5, 50.8, M.art2, 9, 5);

    this.addPoster(scene, 0, 4.5, -24.5, M.scorpion, 11, 6);

    // =========================
    // 6) TELEPORT GLOW PADS (visual markers)
    // =========================
    this.addTeleportPad(scene, 0, 10);
    this.addTeleportPad(scene, 0, 42);      // lobby center
    this.addTeleportPad(scene, -48, 6);     // side room center

    // =========================
    // 7) WINNER HOLOGRAM STATION (lobby feature)
    // =========================
    this.addWinnerHologram(scene, 0, 42);

    // =========================
    // 8) DECOR: Crown + Daily Claim panel (lobby)
    // =========================
    this.addFloatingIcon(scene, -18, 3.0, 42, M.crown, 2.0, 2.0);
    this.addPoster(scene, 18, 3.3, 42, M.dailyClaim, 6.5, 3.5);

    // =========================
    // 9) Spawn guidance marker (subtle, not the big green pole)
    // =========================
    const spawnMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    spawnMarker.rotation.x = -Math.PI / 2;
    spawnMarker.position.set(0, 0.02, 10);
    scene.add(spawnMarker);
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

    // face inward depending on side
    if (Math.abs(z) > Math.abs(x)) poster.rotation.y = (z > 0) ? Math.PI : 0;
    else poster.rotation.y = (x > 0) ? -Math.PI / 2 : Math.PI / 2;

    scene.add(poster);
  },

  addTeleportPad(scene, x, z) {
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 3.0),
      this.matBasic('assets/textures/Teleport glow.jpg', 0xffffff, true, 0.9)
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.02, z);
    scene.add(pad);
  },

  addWinnerHologram(scene, x, z) {
    // pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 })
    );
    base.position.set(x, 0.2, z);
    scene.add(base);

    // hologram plane
    const holo = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3),
      this.matBasic('assets/textures/ui_winner_hologram.jpg', 0xffffff, true, 0.85)
    );
    holo.position.set(x, 3.0, z);
    holo.rotation.y = Math.PI; // face toward main room
    scene.add(holo);

    // winner text overlay
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 1.4),
      this.matBasic('assets/textures/Winner.jpg', 0xffffff, true, 0.95)
    );
    win.position.set(x, 2.1, z + 0.02);
    win.rotation.y = Math.PI;
    scene.add(win);
  },

  addFloatingIcon(scene, x, y, z, mat, w = 1.5, h = 1.5) {
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    icon.position.set(x, y, z);
    icon.rotation.y = Math.PI / 2;
    scene.add(icon);
  }
};
