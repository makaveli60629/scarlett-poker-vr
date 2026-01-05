// js/world.js — VIP Room World (8.0.4) + Bots + Deal Loop
import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";
import { Bots } from "./bots.js";
import { PokerSim } from "./poker_simulation.js";

export const World = {
  group: null,
  floorY: 0,
  _ready: false,

  async build(scene, rig) {
    this.group = new THREE.Group();
    this.group.name = "VIPRoomWorld";
    scene.add(this.group);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.floorY;
    this.group.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c0f15, roughness: 0.95 });
    const roomSize = 26;
    const wallH = 4.2;
    const half = roomSize / 2;

    const wallGeo = new THREE.BoxGeometry(roomSize, wallH, 0.35);
    const wallGeoSide = new THREE.BoxGeometry(0.35, wallH, roomSize);

    const back = new THREE.Mesh(wallGeo, wallMat);
    back.position.set(0, wallH / 2, -half);
    this.group.add(back);

    const front = new THREE.Mesh(wallGeo, wallMat);
    front.position.set(0, wallH / 2, half);
    this.group.add(front);

    const left = new THREE.Mesh(wallGeoSide, wallMat);
    left.position.set(-half, wallH / 2, 0);
    this.group.add(left);

    const right = new THREE.Mesh(wallGeoSide, wallMat);
    right.position.set(half, wallH / 2, 0);
    this.group.add(right);

    // Spawn pad + rig
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.06, 26),
      new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.85 })
    );
    pad.position.set(0, this.floorY + 0.03, 6.5);
    this.group.add(pad);

    if (rig) {
      rig.position.set(0, 0, 6.5);
      rig.rotation.set(0, 0, 0);
    }

    // Boss table center piece
    BossTable.build(scene);

    // Bots + Deal loop
    const tableCenter = new THREE.Vector3(0, 0, -6.5);
    const { seats } = Bots.build(scene, tableCenter, 2.35);
    PokerSim.build(scene, seats, tableCenter);

    this._ready = true;
    return this.group;
  },

  update(dt) {
    if (!this._ready) return;
    Bots.update(dt);
    PokerSim.update(dt);
  },
};
