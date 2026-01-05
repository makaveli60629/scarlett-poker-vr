// js/world.js — VIP Room World (8.0.2 Stable)
import * as THREE from "./three.js";
import { BossTable } from "./boss_table.js";

export const World = {
  group: null,
  floorY: 0,

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
    floor.receiveShadow = false;
    this.group.add(floor);

    // Room box (walls)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c0f15, roughness: 0.95 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.25,
      roughness: 0.35,
    });

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

    // Trim line around the floor perimeter
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(half - 0.55, 0.06, 10, 120),
      trimMat
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = this.floorY + 0.02;
    this.group.add(trim);

    // Corner orbs (fixed to floor, no floating)
    const orbGeo = new THREE.SphereGeometry(0.18, 18, 14);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.25,
      roughness: 0.25,
    });

    const corners = [
      [-half + 1.0, this.floorY + 0.18, -half + 1.0],
      [ half - 1.0, this.floorY + 0.18, -half + 1.0],
      [-half + 1.0, this.floorY + 0.18,  half - 1.0],
      [ half - 1.0, this.floorY + 0.18,  half - 1.0],
    ];
    for (const [x, y, z] of corners) {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(x, y, z);
      this.group.add(orb);

      const pl = new THREE.PointLight(0x00ffaa, 0.35, 10);
      pl.position.set(x, y + 0.55, z);
      this.group.add(pl);
    }

    // Spawn pad (so you DON'T spawn on the boss table)
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.06, 26),
      new THREE.MeshStandardMaterial({
        color: 0x111317,
        roughness: 0.85,
        emissive: 0x004433,
        emissiveIntensity: 0.35,
      })
    );
    pad.position.set(0, this.floorY + 0.03, 6.5);
    this.group.add(pad);

    // Set spawn
    if (rig) {
      rig.position.set(0, 0, 6.5);
      rig.rotation.set(0, 0, 0);
    }

    // Boss table centerpiece
    BossTable.build(scene);

    return this.group;
  },

  update(dt, camera) {
    // (optional later) animate subtle pulse / fog, etc.
  },
};
