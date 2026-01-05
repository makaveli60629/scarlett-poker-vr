// js/world.js — VIP World + Furniture + BossBots (no state.js dependencies)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { BossTable } from "./boss_table.js";
import { TeleportMachine } from "./teleport_machine.js";
import { Chairs } from "./chair.js";

import { Furniture } from "./furniture.js";
import { BossBots } from "./bossbots.js";

export const World = {
  built: false,

  build(scene, player) {
    if (this.built) return;
    this.built = true;

    // Scene baseline (VIP)
    scene.background = new THREE.Color(0x070812);
    scene.fog = new THREE.Fog(0x070812, 14, 120);

    // Lighting (brighter + premium)
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));

    const hemi = new THREE.HemisphereLight(0xbad7ff, 0x111018, 0.9);
    hemi.position.set(0, 12, 0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(9, 14, 8);
    scene.add(key);

    const neonA = new THREE.PointLight(0x00ffaa, 1.25, 34);
    neonA.position.set(0, 3.5, -6.5);
    scene.add(neonA);

    const neonB = new THREE.PointLight(0xff2f6a, 0.85, 28);
    neonB.position.set(5.2, 2.7, -3.6);
    scene.add(neonB);

    // Floor + subtle grid
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0e1220, roughness: 0.96 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 60, 0x223044, 0x111827);
    grid.position.y = 0.01;
    scene.add(grid);

    // Room shell (big enough so it doesn't feel like tunnel)
    const roomSize = 34;
    const roomHeight = 10;

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize, roomHeight, roomSize),
      new THREE.MeshStandardMaterial({
        color: 0x0b0c12,
        roughness: 0.95,
        metalness: 0.05,
        emissive: 0x020208,
        emissiveIntensity: 0.35,
        side: THREE.BackSide,
      })
    );
    room.position.set(0, roomHeight / 2, 0);
    scene.add(room);

    // Build centerpiece + teleport + chairs
    BossTable.build(scene);
    TeleportMachine.build(scene);
    Chairs.build(scene, BossTable.center);

    // Furniture pack (couches, plants, fountain, picture-frame glow)
    Furniture.build(scene, { roomSize, roomHeight });

    // Spawn ALWAYS at teleport pad
    const spawn = TeleportMachine.getSafeSpawn?.() || new THREE.Vector3(0, 0, 10);
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = Math.PI;

    // Boss bots (spectator-only table, for show)
    BossBots.build(scene, {
      center: BossTable.center.clone(),
      railRadius: 4.1,
      botCount: 6
    });
  },

  update(dt, camera, player) {
    // Keep teleport logic alive if you have it
    TeleportMachine.update?.(dt, player, camera);

    // Boss bots animate + nametags face camera (upright)
    BossBots.update(dt, camera);

    // Optional: furniture animations (fountain shimmer etc.)
    Furniture.update?.(dt);
  },
};
