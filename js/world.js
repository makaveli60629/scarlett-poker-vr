// js/world.js — VIP Lobby World (8.2.6 Texture + Solid Collision + Safe)
import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { Leaderboard } from "./leaderboard.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  root: null,
  floor: null,

  // Room bounds (used for collision clamp)
  roomW: 20,
  roomD: 26,
  wallH: 4.5,

  // Table collision
  tableCenter: new THREE.Vector3(0, 0, -6.5),
  tableNoWalkRadius: 3.6, // keep player outside this radius

  _texLoader: new THREE.TextureLoader(),

  loadTex(path) {
    try {
      return this._texLoader.load(path, undefined, undefined, () => null);
    } catch {
      return null;
    }
  },

  async build(scene, rig) {
    this.root = new THREE.Group();
    this.root.name = "WorldRoot";
    scene.add(this.root);

    // Spawn clear
    if (rig) rig.position.set(0, 0, 6.2);

    // FLOOR (YOUR filename)
    const floorPath = "assets/textures/Marblegold floors.jpg";
    const floorTex = this.loadTex(floorPath);
    if (floorTex) {
      floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
      floorTex.repeat.set(2.5, 2.5);
      floorTex.colorSpace = THREE.SRGBColorSpace;
    }

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex || null,
      color: floorTex ? 0xffffff : 0x141318,
      roughness: 0.88,
      metalness: 0.05,
    });

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
    this.floor.name = "Floor";
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.root.add(this.floor);

    // WALLS (solid visually + used in clamp)
    const wallTex = this.loadTex("assets/textures/brickwall.jpg") || this.loadTex("assets/textures/brickwall.png");
    if (wallTex) wallTex.colorSpace = THREE.SRGBColorSpace;

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex || null,
      color: wallTex ? 0xffffff : 0x0b0d13,
      roughness: 0.95,
      metalness: 0.02,
    });

    const roomW = this.roomW;
    const roomD = this.roomD;
    const wallH = this.wallH;

    const back = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    back.position.set(0, wallH / 2, -roomD / 2);
    back.name = "WallBack";
    this.root.add(back);

    const front = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    front.position.set(0, wallH / 2, roomD / 2);
    front.name = "WallFront";
    this.root.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    left.position.set(-roomW / 2, wallH / 2, 0);
    left.name = "WallLeft";
    this.root.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    right.position.set(roomW / 2, wallH / 2, 0);
    right.name = "WallRight";
    this.root.add(right);

    // Glow frames (placeholder)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      transparent: true,
      opacity: 0.65,
    });

    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), frameMat);
      frame.position.set(-5 + i * 5, 2.2, -roomD / 2 + 0.14);
      frame.rotation.y = Math.PI;
      this.root.add(frame);
    }

    // Lighting (brighter)
    this.root.add(new THREE.HemisphereLight(0xffffff, 0x1f2a3a, 1.25));

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 10, 6);
    this.root.add(key);

    const ceiling = new THREE.PointLight(0x66aaff, 0.65, 40);
    ceiling.position.set(0, 3.8, 0);
    this.root.add(ceiling);

    const neon1 = new THREE.PointLight(0x00ffaa, 0.45, 28);
    neon1.position.set(-6.5, 2.6, -6.0);
    this.root.add(neon1);

    const neon2 = new THREE.PointLight(0xff3366, 0.38, 28);
    neon2.position.set(6.5, 2.6, -6.0);
    this.root.add(neon2);

    // Boss Table
    BossTable.build(this.root);

    // Leaderboard
    Leaderboard.build(this.root);
    if (Leaderboard.group) {
      Leaderboard.group.position.set(0, 3.3, -11.7);
      Leaderboard.group.rotation.y = 0;
      Leaderboard.group.scale.setScalar(1.35);
    }

    // Poker Simulation (table center)
    this.tableCenter.set(0, 0, -6.5);
    PokerSimulation.build(this.root, new THREE.Vector3(0, 1.02, -6.5));

    // Constrain spawn immediately
    this.constrainRig?.(rig);
  },

  constrainRig(rig) {
    if (!rig) return;

    // Room clamp
    const halfW = (this.roomW / 2) - 0.75;
    const halfD = (this.roomD / 2) - 0.75;

    rig.position.x = Math.max(-halfW, Math.min(halfW, rig.position.x));
    rig.position.z = Math.max(-halfD, Math.min(halfD, rig.position.z));
    rig.position.y = 0;

    // Table no-walk circle
    const dx = rig.position.x - this.tableCenter.x;
    const dz = rig.position.z - this.tableCenter.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < this.tableNoWalkRadius) {
      const push = (this.tableNoWalkRadius - dist) + 0.03;
      const nx = dx / (dist || 0.0001);
      const nz = dz / (dist || 0.0001);
      rig.position.x += nx * push;
      rig.position.z += nz * push;
    }
  },

  update(dt, camera) {
    PokerSimulation.update(dt, camera);
    Leaderboard.update?.(dt, camera, null);
  },
};
