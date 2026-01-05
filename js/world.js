// js/world.js — VIP Room World (8.0.8) — Teleport Targets + Clean Names
import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { Bots } from "./bots.js";
import { PokerSim } from "./poker_simulation.js";

export const World = {
  group: null,
  _ready: false,
  _teleportTargets: [],

  async build(scene, rig) {
    this.group = new THREE.Group();
    this.group.name = "VIPRoomWorld";
    scene.add(this.group);

    this._teleportTargets = [];

    // FLOOR
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.95 })
    );
    floor.name = "Floor";
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.group.add(floor);
    this._teleportTargets.push(floor);

    // ROOM BOX
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c0f15, roughness: 0.96 });
    const roomSize = 30;
    const wallH = 4.4;
    const half = roomSize / 2;

    const wallGeo = new THREE.BoxGeometry(roomSize, wallH, 0.35);
    const wallGeoSide = new THREE.BoxGeometry(0.35, wallH, roomSize);

    const back = new THREE.Mesh(wallGeo, wallMat);
    back.position.set(0, wallH / 2, -half);
    back.name = "Wall_Back";
    this.group.add(back);

    const front = new THREE.Mesh(wallGeo, wallMat);
    front.position.set(0, wallH / 2, half);
    front.name = "Wall_Front";
    this.group.add(front);

    const left = new THREE.Mesh(wallGeoSide, wallMat);
    left.position.set(-half, wallH / 2, 0);
    left.name = "Wall_Left";
    this.group.add(left);

    const right = new THREE.Mesh(wallGeoSide, wallMat);
    right.position.set(half, wallH / 2, 0);
    right.name = "Wall_Right";
    this.group.add(right);

    // SAFE SPAWN PAD (always spawn here)
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.06, 26),
      new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.85 })
    );
    pad.name = "SpawnPad";
    pad.position.set(0, 0.03, 6.5);
    this.group.add(pad);

    if (rig) {
      rig.position.set(0, 0, 6.5);
      rig.rotation.set(0, 0, 0);
    }

    // Boss table + VIP rail + zone
    BossTable.build(scene);

    // Seats around boss table
    const center = BossTable.center.clone();
    const tableTopRadius = 2.9;
    const chairClearance = 0.65;
    const seatRadius = tableTopRadius + chairClearance; // ~3.55

    const { seats, bots } = Bots.build(scene, center, seatRadius, {
      seatCount: 6,
      seatY: 0,
    });

    // Poker simulation — viewer mode
    PokerSim.build(scene, seats, center, bots);

    this._ready = true;
    return this.group;
  },

  update(dt, camera) {
    if (!this._ready) return;
    Bots.update(dt, camera);
    PokerSim.update(dt, camera);
  },

  getTeleportTargets() {
    return this._teleportTargets || [];
  },
};
