// js/world.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TeleportMachine } from "./teleport_machine.js";
import { BossTable } from "./boss_table.js";
import { Chairs } from "./chair.js";

export const World = {
  built: false,

  build(scene, player) {
    if (this.built) return;
    this.built = true;

    // Background
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 6, 55);

    // Lights (VIP room vibe)
    scene.add(new THREE.HemisphereLight(0x8899ff, 0x090a0f, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 0.65);
    key.position.set(6, 8, 4);
    scene.add(key);

    const rim = new THREE.PointLight(0x00ffaa, 0.55, 25);
    rim.position.set(0, 3.2, -2);
    scene.add(rim);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0d0f18, roughness: 0.98 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Room box (walls + trim look)
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(24, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0b0c12,
        roughness: 0.95,
        side: THREE.BackSide,
      })
    );
    room.position.set(0, 4, -2);
    scene.add(room);

    // Simple “trim” rings
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.9 });
    const trim1 = new THREE.Mesh(new THREE.TorusGeometry(10.0, 0.05, 10, 160), trimMat);
    trim1.rotation.x = Math.PI / 2;
    trim1.position.set(0, 1.2, -2);
    scene.add(trim1);

    const trim2 = new THREE.Mesh(new THREE.TorusGeometry(10.0, 0.05, 10, 160), trimMat);
    trim2.rotation.x = Math.PI / 2;
    trim2.position.set(0, 0.06, -2);
    scene.add(trim2);

    // Corner orbs (your 4 green balls)
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.1,
      roughness: 0.35,
    });
    const orbPos = [
      new THREE.Vector3(-10, 1.0, 8),
      new THREE.Vector3(10, 1.0, 8),
      new THREE.Vector3(-10, 1.0, -12),
      new THREE.Vector3(10, 1.0, -12),
    ];
    for (const p of orbPos) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), orbMat);
      s.position.copy(p);
      scene.add(s);

      const l = new THREE.PointLight(0x00ffaa, 0.35, 10);
      l.position.copy(p);
      scene.add(l);
    }

    // Build centerpiece boss table + rail
    BossTable.build(scene);

    // Teleport machine (also provides safe spawn)
    TeleportMachine.build(scene);

    // Chairs
    Chairs.build(scene, BossTable.center);

    // SAFE SPAWN (fix “spawn on table”)
    const spawn = TeleportMachine.getSafeSpawn();
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = Math.PI; // face into room

    return scene;
  },

  update(dt, camera, player) {
    // reserved hooks
    TeleportMachine.update?.(dt, player, camera);
  },
};
