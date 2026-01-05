import * as THREE from "three";
import { World } from "./world.js";

export const RoomManager = {
  rooms: [],
  spawnPads: [],

  init(scene) {
    this.rooms = [];
    this.spawnPads = [];

    // Build main lobby using World builder
    World.build(scene);

    // Add extra rooms (future tournament / VIP / store rooms)
    this._buildSideRoom(scene, "VIPRoom", 22, 0, 0);
    this._buildSideRoom(scene, "StoreRoom", -22, 0, 0);

    // Add spawn pads in each “room”
    this._addSpawnPad(scene, new THREE.Vector3(0, 0, 6), 0, "Spawn_Lobby");
    this._addSpawnPad(scene, new THREE.Vector3(22, 0, 6), 0, "Spawn_VIP");
    this._addSpawnPad(scene, new THREE.Vector3(-22, 0, 6), 0, "Spawn_Store");
  },

  _buildSideRoom(scene, name, x, y, z) {
    // Simple shell for now (solid + lit)
    const group = new THREE.Group();
    group.name = name;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(14, 4, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 })
    );
    walls.position.y = 2;
    // Make it hollow-ish visually by using wireframe edges later; keep as simple cube for now
    group.add(walls);

    const light = new THREE.PointLight(0xffffff, 0.55, 22);
    light.position.set(0, 2.8, 0);
    group.add(light);

    group.position.set(x, y, z);
    scene.add(group);

    this.rooms.push(group);
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
      new THREE.MeshStandardMaterial({
        color: 0x0c0f12,
        roughness: 0.95,
        metalness: 0.0
      })
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
