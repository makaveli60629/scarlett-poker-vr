// js/world.js — VIP Lobby / Boss Arena World (8.2.3 Polish)
// - Clean room (no textures required, safe fallback colors)
// - Strong lighting (Quest-friendly)
// - Boss table + rail (if available), always stable
// - Leaderboard mounted higher + less likely to be blocked
// - PokerSimulation mounted and updated

import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { Leaderboard } from "./leaderboard.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  floor: null,
  root: null,

  async build(scene, rig, camera) {
    this.root = new THREE.Group();
    this.root.name = "WorldRoot";
    scene.add(this.root);

    // Spawn safety: always spawn slightly forward (not on table)
    if (rig) rig.position.set(0, 0, 4.6);

    // ===== FLOOR =====
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.92,
      metalness: 0.02,
      emissive: 0x05060a,
      emissiveIntensity: 0.05,
    });

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      floorMat
    );
    this.floor.name = "Floor";
    this.floor.rotation.x = -Math.PI/2;
    this.floor.position.y = 0;
    this.root.add(this.floor);

    // ===== WALLS =====
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f1118,
      roughness: 0.95,
      metalness: 0.03,
    });

    const roomW = 16;
    const roomD = 16;
    const wallH = 4;

    const back = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    back.position.set(0, wallH/2, -roomD/2);
    this.root.add(back);

    const front = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    front.position.set(0, wallH/2, roomD/2);
    this.root.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    left.position.set(-roomW/2, wallH/2, 0);
    this.root.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    right.position.set(roomW/2, wallH/2, 0);
    this.root.add(right);

    // ===== EDGE GLOW TRIM =====
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      transparent: true,
      opacity: 0.65,
    });

    const trim = new THREE.Mesh(new THREE.BoxGeometry(roomW-0.3, 0.06, roomD-0.3), trimMat);
    trim.position.set(0, 0.05, 0);
    this.root.add(trim);

    // ===== EXTRA LIGHTS (make it elegant) =====
    const ceilingGlow = new THREE.PointLight(0x66aaff, 0.55, 28);
    ceilingGlow.position.set(0, 3.4, 0);
    this.root.add(ceilingGlow);

    const neon1 = new THREE.PointLight(0x00ffaa, 0.35, 24);
    neon1.position.set(-5.5, 2.4, -4.5);
    this.root.add(neon1);

    const neon2 = new THREE.PointLight(0xff3366, 0.28, 24);
    neon2.position.set(5.5, 2.4, -4.5);
    this.root.add(neon2);

    // ===== BOSS TABLE =====
    // (spectator rail + zone handled by boss_table.js)
    BossTable.build(this.root);

    // ===== LEADERBOARD (raise higher + visible from most angles) =====
    // If your Leaderboard.js uses anchor internally, we place it relative to this world.
    Leaderboard.build(this.root);

    // Move leaderboard higher + a touch closer to back wall
    if (Leaderboard.group) {
      Leaderboard.group.position.set(0, 2.55, -7.35);   // higher + back
      Leaderboard.group.rotation.y = Math.PI;           // face spawn direction
      // make it a bit bigger
      Leaderboard.group.scale.setScalar(1.15);
    }

    // ===== POKER SIM (visual tournament at boss table) =====
    PokerSimulation.build(this.root, new THREE.Vector3(0, 1.02, -6.5));

    // Default leaderboard data (top10 placeholder)
    Leaderboard._drawData?.({
      title: "BOSS TOURNAMENT • TOP 10",
      rows: [
        { name: "BOT 1", points: 0 },
        { name: "BOT 2", points: 0 },
        { name: "BOT 3", points: 0 },
        { name: "BOT 4", points: 0 },
        { name: "BOT 5", points: 0 },
      ],
      footer: "Winner holds crown • Spectator only table",
    });
  },

  update(dt, camera, rig) {
    // update sim
    PokerSimulation.update(dt, camera);

    // keep leaderboard safe / redrawing if you want later
    Leaderboard.update?.(dt, camera, null);
  },
};
