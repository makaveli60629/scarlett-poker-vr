// /js/world.js — VIP Lobby World (8.2 Y-FIX)
// Goal: floor truth = y=0, no clipping, strong lighting, safe spawn pad

import * as THREE from "./three.js";
import { Leaderboard } from "./leaderboard.js";
import { BossTable } from "./boss_table.js";

export const World = {
  root: null,
  floorY: 0,

  // IMPORTANT: your sim/table should use this
  tableCenter: new THREE.Vector3(0, 0, -4.8),

  // spawn pad location (ALWAYS clear)
  spawnPadPos: new THREE.Vector3(0, 0, 2.8),

  build(scene, rig) {
    this.root = new THREE.Group();
    this.root.name = "WORLD_ROOT";
    scene.add(this.root);

    // Background + fog
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 3, 65);

    // ===== FLOOR (y=0 truth) =====
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x14151b,
      roughness: 0.95,
      metalness: 0.05,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
    floor.name = "Floor";
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.floorY;
    floor.receiveShadow = false;
    this.root.add(floor);

    // ===== WALLS (solid look) =====
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d13,
      roughness: 0.95,
      metalness: 0.05,
      emissive: 0x010106,
      emissiveIntensity: 0.35,
    });

    const wallH = 4.2;
    const wallT = 0.25;
    const roomW = 18;
    const roomD = 18;

    const mkWall = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);

    const back = mkWall(roomW, wallH, wallT);
    back.position.set(0, this.floorY + wallH / 2, -roomD / 2);
    this.root.add(back);

    const front = mkWall(roomW, wallH, wallT);
    front.position.set(0, this.floorY + wallH / 2, roomD / 2);
    this.root.add(front);

    const left = mkWall(wallT, wallH, roomD);
    left.position.set(-roomW / 2, this.floorY + wallH / 2, 0);
    this.root.add(left);

    const right = mkWall(wallT, wallH, roomD);
    right.position.set(roomW / 2, this.floorY + wallH / 2, 0);
    this.root.add(right);

    // ===== TRIM GLOW =====
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.65,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.25,
    });

    const trim = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.2, 0.08, 0.08), trimMat);
    trim.position.set(0, this.floorY + 1.0, -roomD / 2 + 0.18);
    this.root.add(trim);

    // ===== LIGHTING (bright, readable on Quest) =====
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
    this.root.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 11, 4);
    this.root.add(dir);

    const p1 = new THREE.PointLight(0x2bd7ff, 0.7, 30);
    p1.position.set(-5, 3.0, -2);
    this.root.add(p1);

    const p2 = new THREE.PointLight(0xff2bd6, 0.55, 30);
    p2.position.set(5, 3.0, -2);
    this.root.add(p2);

    const p3 = new THREE.PointLight(0xffd27a, 0.45, 24);
    p3.position.set(0, 2.7, -7);
    this.root.add(p3);

    // ===== SPAWN PAD (always clear) =====
    const pad = this._makeSpawnPad();
    pad.position.copy(this.spawnPadPos);
    pad.position.y = this.floorY + 0.01;
    this.root.add(pad);

    // Force rig spawn on pad (safe)
    if (rig) {
      rig.position.set(this.spawnPadPos.x, 0, this.spawnPadPos.z);
      rig.rotation.y = 0;
    }

    // ===== BOSS TABLE AREA (spectator only) =====
    // NOTE: BossTable uses its own center. It's fine.
    try { BossTable.build(this.root); } catch (e) { console.warn("BossTable build skipped:", e); }

    // ===== LEADERBOARD (back wall, high & visible) =====
    try {
      Leaderboard.build(this.root);
      // move it up & away so it doesn't clip
      if (Leaderboard.group) {
        Leaderboard.group.position.set(0, 2.15, -8.2);
        Leaderboard.group.rotation.y = Math.PI;
      }
    } catch (e) {
      console.warn("Leaderboard build skipped:", e);
    }

    return this.root;
  },

  update(dt, camera) {
    // Keep leaderboard alive if present
    try {
      Leaderboard.update(dt, camera);
    } catch {}
  },

  _makeSpawnPad() {
    const g = new THREE.Group();
    g.name = "SpawnPad";

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32),
      new THREE.MeshStandardMaterial({ color: 0x101013, roughness: 0.95, metalness: 0.05 })
    );
    base.position.y = 0.02;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.04, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.1,
        roughness: 0.25,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;

    const glow = new THREE.PointLight(0x00ffaa, 0.6, 6);
    glow.position.set(0, 1.2, 0);

    g.add(base, ring, glow);
    return g;
  },
};
