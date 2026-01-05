// js/teleport_machine.js — spawn pads + teleport targets (simple & stable)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  pads: [],
  spawnPad:Name: "spawn_pad",
  spawn: { pos: new THREE.Vector3(0, 0, 6.5), yaw: Math.PI },

  build(scene) {
    this.pads.length = 0;

    // 4 corner pads (you described 4 green balls)
    const corners = [
      new THREE.Vector3( 12.5, 0,  12.5),
      new THREE.Vector3(-12.5, 0,  12.5),
      new THREE.Vector3( 12.5, 0, -12.5),
      new THREE.Vector3(-12.5, 0, -12.5),
    ];

    for (let i = 0; i < corners.length; i++) {
      const g = new THREE.Group();
      g.name = `telepad_${i}`;
      g.position.copy(corners[i]);

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 24, 18),
        new THREE.MeshStandardMaterial({
          color: 0x00ffaa,
          emissive: 0x00ffaa,
          emissiveIntensity: 1.5,
          roughness: 0.25
        })
      );
      ball.position.y = 0.25;

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.035, 10, 64),
        new THREE.MeshStandardMaterial({
          color: 0x00ffaa,
          emissive: 0x00ffaa,
          emissiveIntensity: 0.7,
          roughness: 0.35
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;

      g.add(ring, ball);
      scene.add(g);

      this.pads.push({ group: g, position: g.position.clone(), yaw: 0 });
    }

    // Spawn pad (always safe)
    const spawn = new THREE.Group();
    spawn.name = "spawn_pad_group";
    spawn.position.copy(this.spawn.pos);

    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.20,
        roughness: 0.35
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.01;
    pad.name = "spawn_pad";

    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.03, 10, 48),
      new THREE.MeshStandardMaterial({
        color: 0xff3366,
        emissive: 0xff3366,
        emissiveIntensity: 0.9,
        roughness: 0.35
      })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.y = 0.05;

    spawn.add(pad, marker);
    scene.add(spawn);

    return this.pads;
  },

  getSafeSpawn() {
    return { position: this.spawn.pos.clone(), yaw: this.spawn.yaw };
  },
};
