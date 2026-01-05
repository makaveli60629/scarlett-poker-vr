// js/world.js — STABLE WORLD CORE

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TeleportMachine } from "./teleport_machine.js?v=stable1";
import { BossTable } from "./boss_table.js";

export const World = {
  build(scene, playerGroup) {
    // Lighting
    scene.background = new THREE.Color(0x05060a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(4, 8, 6);
    scene.add(key);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Teleport system
    TeleportMachine.build(scene);

    // Boss Table
    BossTable.build(scene);

    // 🛑 SAFE SPAWN (NEVER CRASHES)
    let spawn;
    try {
      spawn =
        TeleportMachine &&
        typeof TeleportMachine.getSafeSpawn === "function"
          ? TeleportMachine.getSafeSpawn()
          : new THREE.Vector3(0, 0, 3);
    } catch {
      spawn = new THREE.Vector3(0, 0, 3);
    }

    playerGroup.position.copy(spawn);
  }
};
