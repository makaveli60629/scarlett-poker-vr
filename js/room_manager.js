import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { World } from "./world.js";

export const RoomManager = {
  spawnPads: [],

  init(scene) {
    this.spawnPads = [];

    // Build main world
    World.build(scene);

    // Add spawn pads (Lobby + VIP + Store)
    this._addSpawnPad(scene, new THREE.Vector3(0, 0, 6), Math.PI, "Spawn_Lobby");
    this._addSpawnPad(scene, new THREE.Vector3(22, 0, 6), Math.PI, "Spawn_VIP");
    this._addSpawnPad(scene, new THREE.Vector3(-22, 0, 6), Math.PI, "Spawn_Store");
  },

  _addSpawnPad(scene, position, rotationY = 0, name = "SpawnPad") {
    const pad = new THREE.Group();
    pad.name = name;
    pad.position.copy(position);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.08, 12, 28),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        roughness: 0.4
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;

    const center = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.95 })
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.01;

    pad.add(ring, center);
    pad.userData.spawn = { position: position.clone(), rotationY };
    scene.add(pad);

    this.spawnPads.push(pad);
    return pad;
  },

  getSpawnPads() {
    return this.spawnPads;
  }
};
