// js/world.js — VIP Room: square, stable, not tunnel-y
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { BossTable } from "./boss_table.js";
import { TeleportMachine } from "./teleport_machine.js";
import { Chairs } from "./chair.js";

export const World = {
  built: false,

  build(scene, player) {
    if (this.built) return;
    this.built = true;

    // --- Scene baseline ---
    scene.background = new THREE.Color(0x070812);
    scene.fog = new THREE.Fog(0x070812, 14, 120);

    // --- Lighting (brighter + more “room”) ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.60));

    const hemi = new THREE.HemisphereLight(0xbad7ff, 0x111018, 0.85);
    hemi.position.set(0, 12, 0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(8, 14, 8);
    scene.add(key);

    const neonA = new THREE.PointLight(0x00ffaa, 1.25, 34);
    neonA.position.set(0, 3.5, -6.5);
    scene.add(neonA);

    const neonB = new THREE.PointLight(0xff2f6a, 0.85, 28);
    neonB.position.set(5.2, 2.7, -3.6);
    scene.add(neonB);

    // --- Floor (adds a “horizon” so it doesn’t feel circular) ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0e1220, roughness: 0.96 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Grid overlay (subtle)
    const grid = new THREE.GridHelper(60, 60, 0x223044, 0x111827);
    grid.position.y = 0.01;
    scene.add(grid);

    // --- Room shell (keep it big enough so it doesn’t feel like a tunnel) ---
    const roomSize = 34;   // bigger = less “wrap”
    const roomHeight = 10;

    const roomMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      roughness: 0.95,
      metalness: 0.05,
      emissive: 0x020208,
      emissiveIntensity: 0.35,
      side: THREE.BackSide,
    });

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize, roomHeight, roomSize),
      roomMat
    );
    room.position.set(0, roomHeight / 2, 0);
    scene.add(room);

    // Baseboard / trim ring (visual anchor)
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(roomSize * 0.33, 0.07, 10, 180),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.45,
        roughness: 0.35,
      })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.set(0, 1.15, 0);
    scene.add(trim);

    // Corner pillars (another anchor so it feels like a room)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x11131b,
      roughness: 0.85,
      emissive: 0x04050a,
      emissiveIntensity: 0.25,
    });

    const half = roomSize / 2 - 0.6;
    const pillars = [
      new THREE.Vector3(-half, 1.6, -half),
      new THREE.Vector3( half, 1.6, -half),
      new THREE.Vector3(-half, 1.6,  half),
      new THREE.Vector3( half, 1.6,  half),
    ];
    for (const p of pillars) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.6), pillarMat);
      pil.position.copy(p);
      scene.add(pil);

      const pl = new THREE.PointLight(0x00ffaa, 0.35, 12);
      pl.position.set(p.x, 2.9, p.z);
      scene.add(pl);
    }

    // --- Corner orbs (your 4 green balls) ---
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.6,
      roughness: 0.35,
    });
    const orbs = [
      new THREE.Vector3(-half + 1.0, 1.0,  half - 1.0),
      new THREE.Vector3( half - 1.0, 1.0,  half - 1.0),
      new THREE.Vector3(-half + 1.0, 1.0, -half + 1.0),
      new THREE.Vector3( half - 1.0, 1.0, -half + 1.0),
    ];
    for (const p of orbs) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), orbMat);
      orb.position.copy(p);
      scene.add(orb);

      const l = new THREE.PointLight(0x00ffaa, 0.5, 14);
      l.position.copy(p);
      scene.add(l);
    }

    // --- Centerpiece table area ---
    BossTable.build(scene);

    // Teleport pad spawn
    TeleportMachine.build(scene);

    // Chairs
    Chairs.build(scene, BossTable.center);

    // --- Spawn: center-front of room, facing table ---
    // We want player to enter “looking at” the boss table.
    const spawn = TeleportMachine.getSafeSpawn?.() || new THREE.Vector3(0, 0, 10);
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = Math.PI; // face toward -Z
  },

  update() {},
};
