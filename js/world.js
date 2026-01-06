// js/world.js — VIP Lobby / Boss Arena World (8.2.4 Straighten Pass)
// Fixes:
// - Room expanded so Boss Table at z=-6.5 never intersects walls
// - Better floor color (casino carpet vibe)
// - Leaderboard mounted high, centered, readable
// - Hooks PokerSimulation + BossTable safely

import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { Leaderboard } from "./leaderboard.js";
import { PokerSimulation } from "./poker_simulation.js";

export const World = {
  root: null,
  floor: null,

  async build(scene, rig) {
    this.root = new THREE.Group();
    this.root.name = "WorldRoot";
    scene.add(this.root);

    // Spawn safety (front of room, away from table zone)
    if (rig) rig.position.set(0, 0, 6.2);

    // ---------- FLOOR (better color) ----------
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x141016,      // deep casino carpet tone
      roughness: 0.95,
      metalness: 0.02,
      emissive: 0x050408,
      emissiveIntensity: 0.07,
    });

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
    this.floor.name = "Floor";
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.root.add(this.floor);

    // ---------- ROOM (expanded depth so table never clips) ----------
    const roomW = 20;
    const roomD = 26; // KEY FIX: deeper room
    const wallH = 4.5;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d13,
      roughness: 0.97,
      metalness: 0.03,
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    back.position.set(0, wallH / 2, -roomD / 2);
    this.root.add(back);

    const front = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.25), wallMat);
    front.position.set(0, wallH / 2, roomD / 2);
    this.root.add(front);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    left.position.set(-roomW / 2, wallH / 2, 0);
    this.root.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, roomD), wallMat);
    right.position.set(roomW / 2, wallH / 2, 0);
    this.root.add(right);

    // ---------- GLOW TRIM ----------
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      transparent: true,
      opacity: 0.60,
    });

    const trim = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.3, 0.06, roomD - 0.3), trimMat);
    trim.position.set(0, 0.05, 0);
    this.root.add(trim);

    // ---------- LIGHTING (brighter + elegant) ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1f2a3a, 1.15);
    this.root.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(5, 10, 6);
    this.root.add(key);

    const ceilingGlow = new THREE.PointLight(0x66aaff, 0.6, 34);
    ceilingGlow.position.set(0, 3.8, 0);
    this.root.add(ceilingGlow);

    const neon1 = new THREE.PointLight(0x00ffaa, 0.4, 28);
    neon1.position.set(-6.5, 2.6, -6.0);
    this.root.add(neon1);

    const neon2 = new THREE.PointLight(0xff3366, 0.32, 28);
    neon2.position.set(6.5, 2.6, -6.0);
    this.root.add(neon2);

    // ---------- BOSS TABLE ----------
    // Boss table is centered at z=-6.5; room depth now supports it safely.
    BossTable.build(this.root);

    // ---------- LEADERBOARD ----------
    Leaderboard.build(this.root);
    if (Leaderboard.group) {
      // High enough to be readable from anywhere, but not absurdly high
      Leaderboard.group.position.set(0, 2.95, -11.3);
      Leaderboard.group.rotation.y = Math.PI;
      Leaderboard.group.scale.setScalar(1.25);
    }

    // ---------- POKER SIM ----------
    // Table center must match BossTable center (0,1.02,-6.5)
    PokerSimulation.build(this.root, new THREE.Vector3(0, 1.02, -6.5));

    // Default LB text (you can wire real results later)
    Leaderboard._drawData?.({
      title: "BOSS TOURNAMENT • TOP 10",
      rows: [
        { name: "BOT 1", points: 0 },
        { name: "BOT 2", points: 0 },
        { name: "BOT 3", points: 0 },
        { name: "BOT 4", points: 0 },
        { name: "BOT 5", points: 0 },
      ],
      footer: "Spectator-only Boss Table • Winner holds the crown",
    });
  },

  update(dt, camera) {
    PokerSimulation.update(dt, camera);
    Leaderboard.update?.(dt, camera, null);
  },
};
