// /js/world.js — World bootstrap (forces Bots + faces table)
import * as THREE from "./three.js";
import { Bots } from "./bots.js";

export const World = {
  scene: null,
  rig: null,
  seats: [],
  lobbyZone: null,

  init({ scene, rig } = {}) {
    this.scene = scene || new THREE.Scene();
    this.rig = rig || new THREE.Group();

    // If caller didn't add rig to scene yet, do it
    if (!this.rig.parent) this.scene.add(this.rig);

    this._buildLighting();
    this._buildFloor();

    // Table center (match your project vibe)
    const tableCenter = new THREE.Vector3(0, 0, -6.5);

    // Seats (6)
    this.seats = this._makeSeats6(tableCenter, 2.0);

    // Lobby zone (bots wander here)
    this.lobbyZone = {
      min: new THREE.Vector3(-5, 0, 6),
      max: new THREE.Vector3(5, 0, 14),
    };

    // Force player spawn position + facing table
    this._spawnPlayerFacing(tableCenter);

    // Spawn bots
    Bots.init({
      scene: this.scene,
      rig: this.rig,
      getSeats: () => this.seats,
      getLobbyZone: () => this.lobbyZone,
    });

    console.log("[World] init complete. Using Bots (not BossBots).");

    return this.scene;
  },

  update(dt) {
    Bots.update(dt);
  },

  _buildLighting() {
    // bright, safe defaults (you can swap to lights_pack.js later)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.1));

    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(6, 10, 4);
    key.castShadow = false;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-6, 6, 8);
    this.scene.add(fill);
  },

  _buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 1.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "floor";
    this.scene.add(floor);
  },

  _makeSeats6(center, radius) {
    const seats = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = center.x + Math.cos(a) * radius;
      const z = center.z + Math.sin(a) * radius;

      // yaw faces the table center
      const dir = new THREE.Vector3(center.x - x, 0, center.z - z);
      const yaw = Math.atan2(dir.x, dir.z);

      seats.push({
        position: new THREE.Vector3(x, 0, z),
        yaw,
      });
    }
    return seats;
  },

  _spawnPlayerFacing(target) {
    // Put player in the lobby facing the table
    this.rig.position.set(0, 0, 10);

    const dir = target.clone().sub(this.rig.position);
    dir.y = 0;
    const yaw = Math.atan2(dir.x, dir.z);
    this.rig.rotation.set(0, yaw, 0);

    console.log("[World] Player yaw set to face table.");
  },
};
