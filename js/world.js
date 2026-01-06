// /js/world.js — 9.0 Lobby World (no textures required)
// Big lights, safe spawn pad, plants, fountain, table center, leaderboard mount point

import * as T from "./three.js";
const THREE = T;

import { Leaderboard } from "./leaderboard.js";
import { BossTable } from "./boss_table.js";

export const World = {
  root: null,
  floorY: 0,

  // poker table center
  tableCenter: new THREE.Vector3(0, 0, -4.8),

  // always spawn here
  spawnPadPos: new THREE.Vector3(0, 0, 2.8),

  build(scene, rig) {
    this.root = new THREE.Group();
    this.root.name = "WORLD_ROOT";
    scene.add(this.root);

    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 3, 70);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.96, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.floorY;
    this.root.add(floor);

    // Room
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d13, roughness: 0.92, metalness: 0.08,
      emissive: 0x020208, emissiveIntensity: 0.25
    });

    const wallH = 4.2, wallT = 0.25, roomW = 20, roomD = 20;
    const mk = (w,h,d)=> new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);

    const back = mk(roomW, wallH, wallT); back.position.set(0, wallH/2, -roomD/2);
    const front= mk(roomW, wallH, wallT); front.position.set(0, wallH/2,  roomD/2);
    const left = mk(wallT, wallH, roomD); left.position.set(-roomW/2, wallH/2, 0);
    const right= mk(wallT, wallH, roomD); right.position.set( roomW/2, wallH/2, 0);

    this.root.add(back, front, left, right);

    // Neon trim frames for “future wall art”
    this._addWallFrames();

    // Lighting pack (bright)
    this.root.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.25));
    const d = new THREE.DirectionalLight(0xffffff, 1.10);
    d.position.set(6, 11, 4);
    this.root.add(d);

    const p1 = new THREE.PointLight(0x2bd7ff, 0.75, 35); p1.position.set(-6, 3.2, -1);
    const p2 = new THREE.PointLight(0xff2bd6, 0.65, 35); p2.position.set( 6, 3.2, -1);
    const p3 = new THREE.PointLight(0xffd27a, 0.45, 26); p3.position.set( 0, 2.7, -7);
    this.root.add(p1,p2,p3);

    // Spawn pad
    const pad = this._makeSpawnPad();
    pad.position.set(this.spawnPadPos.x, 0.01, this.spawnPadPos.z);
    this.root.add(pad);

    // Plants
    this._addPlants();

    // Fountain (corner)
    this._addFountain();

    // Boss table area (spectator only) – visual centerpiece
    try { BossTable.build(this.root); } catch {}

    // Leaderboard (back wall)
    try {
      Leaderboard.build(this.root);
      if (Leaderboard.group) {
        Leaderboard.group.position.set(0, 2.25, -8.4);
        Leaderboard.group.rotation.y = Math.PI;
      }
    } catch {}

    // Spawn rig safely
    if (rig) {
      rig.position.set(this.spawnPadPos.x, 0, this.spawnPadPos.z);
      rig.rotation.y = 0;
    }

    return this.root;
  },

  update(dt, camera) {
    try { Leaderboard.update(dt, camera); } catch {}
  },

  _makeSpawnPad() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32),
      new THREE.MeshStandardMaterial({ color: 0x111117, roughness: 0.95 })
    );
    base.position.y = 0.02;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.04, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.1, roughness: 0.25
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;

    const glow = new THREE.PointLight(0x00ffaa, 0.6, 6);
    glow.position.set(0, 1.2, 0);

    g.add(base, ring, glow);
    return g;
  },

  _addPlants() {
    const plant = (x,z,s=1) => {
      const g = new THREE.Group();
      g.position.set(x,0,z);

      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22*s, 0.26*s, 0.28*s, 18),
        new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.9 })
      );
      pot.position.y = 0.14*s;

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03*s, 0.04*s, 0.55*s, 10),
        new THREE.MeshStandardMaterial({ color: 0x1f5a2e, roughness: 0.85 })
      );
      stem.position.y = 0.48*s;

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.22*s, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0x2f9b4e, roughness: 0.8 })
      );
      crown.position.y = 0.76*s;

      g.add(pot, stem, crown);
      this.root.add(g);
    };

    plant(-7, -6, 1.3);
    plant( 7, -6, 1.3);
    plant(-7,  6, 1.1);
    plant( 7,  6, 1.1);
  },

  _addFountain() {
    const g = new THREE.Group();
    g.position.set(-7.4, 0, -7.6);

    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.15 })
    );
    basin.position.y = 0.13;

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.65, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x2bd7ff, emissive: 0x0a2a33, emissiveIntensity: 0.35, roughness: 0.15 })
    );
    water.position.y = 0.22;

    const spout = new THREE.PointLight(0x2bd7ff, 0.35, 6);
    spout.position.set(0, 1.2, 0);

    g.add(basin, water, spout);
    this.root.add(g);
  },

  _addWallFrames() {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x07080c,
      roughness: 0.7,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.22
    });

    const mkFrame = (x,y,z, ry=0) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.06), frameMat);
      frame.position.set(x,y,z);
      frame.rotation.y = ry;
      this.root.add(frame);
    };

    // Back wall frames
    mkFrame(-5.2, 2.2, -9.7, 0);
    mkFrame( 0.0, 2.2, -9.7, 0);
    mkFrame( 5.2, 2.2, -9.7, 0);

    // Side wall frames
    mkFrame(-9.7, 2.2, -2.0, Math.PI/2);
    mkFrame( 9.7, 2.2, -2.0, -Math.PI/2);
  }
};
