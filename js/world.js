// js/world.js — VIP Room Restore (Bright + Centerpiece Table/Rail + Chairs + Spawn Pad)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { BossTable } from "./boss_table.js";
import { TeleportMachine } from "./teleport_machine.js";
import { Chairs } from "./chair.js";

export const World = {
  built: false,

  build(scene, player) {
    if (this.built) return;
    this.built = true;

    // VIP background & fog (but not “black swallow”)
    scene.background = new THREE.Color(0x070812);
    scene.fog = new THREE.Fog(0x070812, 10, 95);

    // --- LIGHTS (VIP but visible) ---
    // Strong ambient base so it never goes black in Quest
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // Hemisphere = lifts shadows
    const hemi = new THREE.HemisphereLight(0xbad7ff, 0x161622, 0.75);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    // Key directional
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(7, 11, 6);
    scene.add(key);

    // Centerpiece glow
    const neonA = new THREE.PointLight(0x00ffaa, 1.15, 30);
    neonA.position.set(0, 3.4, -6.5);
    scene.add(neonA);

    const neonB = new THREE.PointLight(0xff2f6a, 0.75, 25);
    neonB.position.set(4.5, 2.6, -4.0);
    scene.add(neonB);

    // --- FLOOR ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(48, 48),
      new THREE.MeshStandardMaterial({ color: 0x0e1220, roughness: 0.96, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // --- ROOM “BOX” (your walls) ---
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(26, 9, 26),
      new THREE.MeshStandardMaterial({
        color: 0x0b0c12,
        roughness: 0.95,
        metalness: 0.05,
        emissive: 0x020208,
        emissiveIntensity: 0.45,
        side: THREE.BackSide,
      })
    );
    room.position.set(0, 4.5, -2);
    scene.add(room);

    // --- Corner orbs (your green balls) ---
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.85,
      roughness: 0.35,
    });
    const corners = [
      new THREE.Vector3(-10.5, 1.0, 8.5),
      new THREE.Vector3(10.5, 1.0, 8.5),
      new THREE.Vector3(-10.5, 1.0, -12.5),
      new THREE.Vector3(10.5, 1.0, -12.5),
    ];
    for (const p of corners) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), orbMat);
      orb.position.copy(p);
      scene.add(orb);

      const pl = new THREE.PointLight(0x00ffaa, 0.55, 14);
      pl.position.copy(p);
      scene.add(pl);
    }

    // --- CENTERPIECE ---
    BossTable.build(scene);

    // --- TELEPORT SPAWN PAD ---
    TeleportMachine.build(scene);

    // --- CHAIRS ---
    Chairs.build(scene, BossTable.center);

    // Spawn ALWAYS at pad (never on table)
    const spawn = TeleportMachine.getSafeSpawn();
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = Math.PI;

    // Small extra: “ceiling glow strip” so the room feels premium
    const strip = new THREE.Mesh(
      new THREE.TorusGeometry(11.5, 0.045, 10, 160),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.9,
        roughness: 0.3,
      })
    );
    strip.rotation.x = Math.PI / 2;
    strip.position.set(0, 3.8, -2);
    scene.add(strip);
  },

  update() {},
};
