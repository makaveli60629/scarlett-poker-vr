// /js/world.js — Update 9.0 Fix Pack A (Textures Import Fix)
// IMPORTANT: This version does NOT import `Textures` (your textures.js doesn't export it).
// It uses direct filenames from /assets/textures/ with TextureBank.standard({ mapFile: "name.jpg" })
// If a file is missing, TextureBank should still fall back to color.

import * as THREE from "./three.js";
import { TextureBank } from "./textures.js";
import { TeleportMachine } from "./teleport_machine.js";

export const World = {
  colliders: [],
  bounds: { minX: -14, maxX: 14, minZ: -14, maxZ: 10 },
  tableCenter: new THREE.Vector3(0, 0, -4.8),

  teleport: null,
  spawn: { position: new THREE.Vector3(0, 0, 5), yaw: Math.PI },

  // small helper so we don't repeat ourselves
  T(file) { return file; },

  build(scene) {
    this.colliders = [];

    // ---------- LIGHTING ----------
    scene.background = new THREE.Color(0x07070c);
    scene.fog = new THREE.Fog(0x07070c, 8, 55);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.95);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 10, 8);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xfff0d0, 0.65);
    fill.position.set(-8, 6, -6);
    scene.add(fill);

    const glowA = new THREE.PointLight(0x2bd7ff, 0.55, 22);
    glowA.position.set(0, 4.8, -6);
    scene.add(glowA);

    const glowB = new THREE.PointLight(0xffd27a, 0.55, 22);
    glowB.position.set(0, 4.2, 2);
    scene.add(glowB);

    // ---------- FLOOR ----------
    const floorMat = TextureBank.standard({
      mapFile: this.T("Marblegold floors.jpg"),
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      repeat: [6, 6],
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // ---------- ROOM (bigger + higher walls) ----------
    const roomW = 30;
    const roomD = 26;
    const wallH = 9.2;

    // tile bricks smaller via repeat
    const wallMat = TextureBank.standard({
      mapFile: this.T("brickwall.jpg"),
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      repeat: [10, 3], // smaller bricks
    });

    const trimGold = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.45,
    });

    const walls = new THREE.Group();
    walls.name = "Walls";

    const mkWall = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

    const back = mkWall(roomW, wallH, wallMat);
    back.position.set(0, wallH / 2, -roomD / 2);
    back.rotation.y = Math.PI;
    walls.add(back);

    const front = mkWall(roomW, wallH, wallMat);
    front.position.set(0, wallH / 2, roomD / 2);
    walls.add(front);

    const left = mkWall(roomD, wallH, wallMat);
    left.position.set(-roomW / 2, wallH / 2, 0);
    left.rotation.y = Math.PI / 2;
    walls.add(left);

    const right = mkWall(roomD, wallH, wallMat);
    right.position.set(roomW / 2, wallH / 2, 0);
    right.rotation.y = -Math.PI / 2;
    walls.add(right);

    scene.add(walls);

    // gold base trim (around bottom)
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, 0.22, roomD),
      trimGold
    );
    trim.position.set(0, 0.11, 0);
    trim.material.transparent = true;
    trim.material.opacity = 0.95;
    scene.add(trim);

    // corner pillars (gold)
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.28, wallH, 18);
    const corners = [
      [-roomW / 2 + 0.25, wallH / 2, -roomD / 2 + 0.25],
      [ roomW / 2 - 0.25, wallH / 2, -roomD / 2 + 0.25],
      [-roomW / 2 + 0.25, wallH / 2,  roomD / 2 - 0.25],
      [ roomW / 2 - 0.25, wallH / 2,  roomD / 2 - 0.25],
    ];
    for (const c of corners) {
      const p = new THREE.Mesh(pillarGeo, trimGold);
      p.position.set(c[0], c[1], c[2]);
      scene.add(p);
    }

    // ---------- TABLE PLATFORM ----------
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(6.1, 6.1, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.95 })
    );
    platform.position.set(this.tableCenter.x, 0.04, this.tableCenter.z);
    scene.add(platform);

    // ---------- CIRCULAR RAIL WITH BARS ----------
    this.buildRail(scene, this.tableCenter);

    // ---------- WALL ART ----------
    this.addWallArt(scene, roomW, roomD, wallH);

    // ---------- TELEPORT MACHINE (spawn anchor) ----------
    this.teleport = TeleportMachine.build(scene);

    const s = TeleportMachine.getSafeSpawn();
    this.spawn = { position: s.position.clone(), yaw: s.yaw };

    // ---------- COLLIDERS ----------
    // walls AABB
    this.addBoxCollider(0, wallH / 2, -roomD / 2 + 0.02, roomW, wallH, 0.2); // back
    this.addBoxCollider(0, wallH / 2,  roomD / 2 - 0.02, roomW, wallH, 0.2); // front
    this.addBoxCollider(-roomW / 2 + 0.02, wallH / 2, 0, 0.2, wallH, roomD); // left
    this.addBoxCollider( roomW / 2 - 0.02, wallH / 2, 0, 0.2, wallH, roomD); // right

    // rail ring collider band
    this.addRailColliders(this.tableCenter);

    return {
      colliders: this.colliders,
      bounds: this.bounds,
      teleport: this.teleport,
      spawn: this.spawn,
      tableCenter: this.tableCenter.clone(),
    };
  },

  buildRail(scene, center) {
    const g = new THREE.Group();
    g.name = "Rail";

    const railRadius = 6.0;
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c24,
      roughness: 0.65,
      metalness: 0.1
    });

    const gold = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.45
    });

    // top ring
    const top = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, 0.08, 14, 120),
      ringMat
    );
    top.rotation.x = Math.PI / 2;
    top.position.set(center.x, 1.05, center.z);
    g.add(top);

    // bottom ring
    const bot = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, 0.06, 12, 120),
      ringMat
    );
    bot.rotation.x = Math.PI / 2;
    bot.position.set(center.x, 0.55, center.z);
    g.add(bot);

    // bars
    const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 10);
    const bars = 56;
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2;
      const x = center.x + Math.cos(a) * railRadius;
      const z = center.z + Math.sin(a) * railRadius;

      const bar = new THREE.Mesh(barGeo, gold);
      bar.position.set(x, 0.78, z);
      g.add(bar);
    }

    const glow = new THREE.PointLight(0x2bd7ff, 0.35, 16);
    glow.position.set(center.x, 1.8, center.z);
    g.add(glow);

    scene.add(g);
  },

  addWallArt(scene, roomW, roomD, wallH) {
    const artMat = TextureBank.standard({
      mapFile: this.T("casino_art.jpg"),
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      repeat: [1, 1]
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.45
    });

    const makeFramed = (w, h) => {
      const g = new THREE.Group();
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), frameMat);
      frame.position.z = -0.05;
      g.add(art, frame);

      const l = new THREE.PointLight(0xffd27a, 0.4, 8);
      l.position.set(0, 0, 1.2);
      g.add(l);
      return g;
    };

    const art1 = makeFramed(4.2, 2.4);
    art1.position.set(0, 4.2, -roomD / 2 + 0.12);
    art1.rotation.y = Math.PI;
    scene.add(art1);

    const art2 = makeFramed(3.6, 2.1);
    art2.position.set(-roomW / 2 + 0.12, 4.0, -2);
    art2.rotation.y = Math.PI / 2;
    scene.add(art2);

    const art3 = makeFramed(3.6, 2.1);
    art3.position.set(roomW / 2 - 0.12, 4.0, -2);
    art3.rotation.y = -Math.PI / 2;
    scene.add(art3);
  },

  addBoxCollider(x, y, z, sx, sy, sz) {
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(sx, sy, sz)
    );
    this.colliders.push(box);
  },

  addRailColliders(center) {
    const r = 6.0;
    const y = 0.9;
    const h = 1.6;
    const t = 0.4;

    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      this.addBoxCollider(x, y, z, 2.0, h, t);
    }
  }
};
