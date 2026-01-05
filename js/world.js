// js/world.js — VIP room look (trim, glow edges, floor, walls)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { BossTable } from "./boss_table.js";
import { TeleportMachine } from "./teleport_machine.js";

export const World = {
  build(scene, playerRig) {
    // Background + fog for stability
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 5, 45);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.9);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(6, 10, 4);
    scene.add(dir);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Room box (walls)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f121c, roughness: 0.95 });
    const wallH = 4.2;
    const half = 14;

    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };

    // 4 walls
    mkWall(28.5, wallH, 0.35, 0, wallH/2, -half);
    mkWall(28.5, wallH, 0.35, 0, wallH/2,  half);
    mkWall(0.35, wallH, 28.5, -half, wallH/2, 0);
    mkWall(0.35, wallH, 28.5,  half, wallH/2, 0);

    // Ceiling (optional dark)
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x07080e, roughness: 1.0 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = wallH;
    scene.add(ceil);

    // Glow trim (edges)
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.3
    });

    const mkTrim = (w, h, d, x, y, z) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trimMat);
      t.position.set(x, y, z);
      scene.add(t);
      return t;
    };

    // Floor-level trim
    mkTrim(28.8, 0.06, 0.08, 0, 0.03, -half + 0.12);
    mkTrim(28.8, 0.06, 0.08, 0, 0.03,  half - 0.12);
    mkTrim(0.08, 0.06, 28.8, -half + 0.12, 0.03, 0);
    mkTrim(0.08, 0.06, 28.8,  half - 0.12, 0.03, 0);

    // Top trim
    mkTrim(28.8, 0.06, 0.08, 0, wallH - 0.03, -half + 0.12);
    mkTrim(28.8, 0.06, 0.08, 0, wallH - 0.03,  half - 0.12);
    mkTrim(0.08, 0.06, 28.8, -half + 0.12, wallH - 0.03, 0);
    mkTrim(0.08, 0.06, 28.8,  half - 0.12, wallH - 0.03, 0);

    // Boss table + rail
    BossTable.build(scene);

    // Teleport pads + spawn pad
    TeleportMachine.build(scene);

    // Safe spawn (ALWAYS ON SPAWN PAD)
    const s = TeleportMachine.getSafeSpawn();
    playerRig.position.copy(s.position);
    playerRig.position.y = 0;
    playerRig.rotation.set(0, s.yaw, 0);
  }
};
