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
    scene.background = new THREE.Color(0x070812);

    // Fog lighter + farther so it doesn’t swallow everything
    scene.fog = new THREE.Fog(0x070812, 10, 90);

    // --- LIGHTING (Quest-friendly) ---
    // Strong ambient so you never get “all black”
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xaabaff, 0x111018, 0.55);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(8, 10, 6);
    scene.add(key);

    const fill = new THREE.PointLight(0x66ccff, 0.55, 35);
    fill.position.set(-6, 3.2, 2);
    scene.add(fill);

    const neon = new THREE.PointLight(0x00ffaa, 0.7, 28);
    neon.position.set(0, 3.2, -4);
    scene.add(neon);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 44),
      new THREE.MeshStandardMaterial({ color: 0x0f1220, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Room box (BackSide so you are inside it)
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(26, 9, 26),
      new THREE.MeshStandardMaterial({
        color: 0x0b0c12,
        roughness: 0.95,
        side: THREE.BackSide,
      })
    );
    room.position.set(0, 4.5, -2);
    scene.add(room);

    // Corner orbs (bright anchors)
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.6,
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

    // Centerpiece table + rail
    BossTable.build(scene);

    // Teleport machine (spawn)
    TeleportMachine.build(scene);

    // Chairs
    Chairs.build(scene, BossTable.center);

    // Spawn at pad (never on table)
    const spawn = TeleportMachine.getSafeSpawn();
    player.position.set(spawn.x, 0, spawn.z);
    player.rotation.y = Math.PI;

    return scene;
  },

  update(dt, camera, player) {
    TeleportMachine.update?.(dt, player, camera);
  },
};
