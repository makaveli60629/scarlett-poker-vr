import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Table } from './table.js';

export const World = {
  textureLoader: new THREE.TextureLoader(),

  // runtime registry
  R: {
    teleportables: [],
    colliders: []
  },

  getRuntime() {
    return this.R;
  },

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

  build(scene) {
    // reset runtime
    this.R.teleportables = [];
    this.R.colliders = [];

    // lighting
    scene.background = new THREE.Color(0x0b0b12);
    scene.add(new THREE.AmbientLight(0xffffff, 1.10));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(10, 18, 8);
    scene.add(sun);

    const fill = new THREE.PointLight(0xffffff, 1.15, 160);
    fill.position.set(0, 10, 0);
    scene.add(fill);

    // materials
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

    // Floors (teleportable)
    const mainFloor = this.addTeleportFloor(scene, 0, 0, 70, 70, M.marbleGold);
    const lobbyFloor = this.addTeleportFloor(scene, 0, 42, 52, 38, M.lobbyCarpet);
    const sideFloor = this.addTeleportFloor(scene, -48, 6, 36, 36, M.marbleGold);

    // Rooms with walls (colliders)
    this.makeRoom(scene, 0, 0, 70, 10, M.brick);
    this.makeRoom(scene, 0, 42, 52, 10, M.brick);
    this.makeRoom(scene, -48, 6, 36, 10, M.brick);

    // Rune feature wall behind table
    const runeWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), M.runes);
    runeWall.position.set(0, 4, -18);
    scene.add(runeWall);

    // Ceiling dome (visual)
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

    // Teleport pads (extra valid spots)
    this.addTeleportPad(scene, 0, 10, M.teleport);
    this.addTeleportPad(scene, 0, 42, M.teleport);
    this.addTeleportPad(scene, -48, 6, M.teleport);

    // Table + chairs
    const t = Table.createTable(scene, 0, 0);
    this.R.colliders.push(t.collider);
    Table.createChairs(scene, 0, 0);

    // Store kiosk (visual placeholder)
    this.addStoreKiosk(scene, 18, 42);

    // Spawn ring (visual)
    const spawnRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.position.set(0, 0.02, 10);
    scene.add(spawnRing);
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

  makeRoom(scene, cx, cz, size, height, mat) {
    const t = 1.0;
    const half = size / 2;

    const back = new THREE.Mesh(new THREE.BoxGeometry(size, height, t), mat);
    back.position.set(cx, height / 2, cz - half);
    scene.add(back);
    this.R.colliders.push(this.boxColliderFromMesh(back));

    const front = back.clone();
    front.position.set(cx, height / 2, cz + half);
    scene.add(front);
    this.R.colliders.push(this.boxColliderFromMesh(front));

    const left = new THREE.Mesh(new THREE.BoxGeometry(t, height, size), mat);
    left.position.set(cx - half, height / 2, cz);
    scene.add(left);
    this.R.colliders.push(this.boxColliderFromMesh(left));

    const right = left.clone();
    right.position.set(cx + half, height / 2, cz);
    scene.add(right);
    this.R.colliders.push(this.boxColliderFromMesh(right));
  },

  boxColliderFromMesh(mesh) {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox.clone();
    // Convert local bb to world-space min/max (mesh is axis-aligned, so this is OK)
    const min = bb.min.clone().add(mesh.position);
    const max = bb.max.clone().add(mesh.position);
    return { type: "aabb", min, max };
  },

  addPoster(scene, x, y, z, mat, w = 6, h = 4) {
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    poster.position.set(x, y, z);
    poster.rotation.y = (z > 0) ? Math.PI : 0;
    scene.add(poster);
  },

  addStoreKiosk(scene, x, z) {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.9 })
    );
    stand.position.set(x, 0.6, z);
    scene.add(stand);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 1.4),
      new THREE.MeshBasicMaterial({ color: 0x00ffd5, transparent: true, opacity: 0.85 })
    );
    sign.position.set(x, 2.1, z + 0.62);
    sign.rotation.y = -Math.PI / 2;
    scene.add(sign);
  }
};
