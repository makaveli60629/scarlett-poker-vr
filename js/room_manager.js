// js/room_manager.js — Patch 7.0A FULL
// Rooms reduced to: Lobby + VIP Poker Room
// Keeps: spawn pads in every room + transforms

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { setCurrentRoom } from "./state.js";

export const RoomManager = {
  scene: null,
  rooms: new Map(), // name -> { name, group, anchor, pad, clearRadius }

  init(scene) {
    this.scene = scene;
    this.rooms.clear();

    // Only TWO rooms now:
    this._createRoom("Lobby", new THREE.Vector3(0, 0, 0), 0);
    this._createRoom("VIP Poker Room", new THREE.Vector3(34, 0, 0), Math.PI);

    setCurrentRoom("Lobby");
  },

  _createRoom(name, position, rotY) {
    const g = new THREE.Group();
    g.name = `Room_${name}`;
    g.position.copy(position);
    g.rotation.y = rotY;

    // subtle floor tint per room
    const floorColor = name === "Lobby" ? 0x121621 : 0x16121f;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        opacity: 0.35
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    g.add(floor);

    // Spawn pad (authoritative)
    const pad = this._createSpawnPad(name);
    pad.position.set(0, 0.01, 8.2);
    g.add(pad);

    const anchor = new THREE.Object3D();
    anchor.name = `Anchor_${name}`;
    anchor.position.set(0, 0, 0);
    g.add(anchor);

    this.scene.add(g);

    this.rooms.set(name, {
      name,
      group: g,
      anchor,
      pad,
      clearRadius: 1.45
    });
  },

  _createSpawnPad(name) {
    const group = new THREE.Group();
    group.name = `SpawnPad_${name}`;

    const base = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 40),
      new THREE.MeshStandardMaterial({
        color: 0x071018,
        roughness: 0.9,
        metalness: 0.05,
        emissive: 0x071018,
        emissiveIntensity: 0.35
      })
    );
    base.rotation.x = -Math.PI / 2;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.70, 0.92, 44),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.55,
        roughness: 0.3
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.56, 0.68, 44),
      new THREE.MeshStandardMaterial({
        color: 0xff3c78,
        emissive: 0xff3c78,
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.30,
        roughness: 0.3
      })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.003;

    const light = new THREE.PointLight(0x00ffaa, 0.65, 3.2);
    light.position.set(0, 0.35, 0);

    group.add(base, ring, ring2, light);

    group.userData.isSpawnPad = true;
    group.userData.roomName = name;

    return group;
  },

  getRooms() {
    return Array.from(this.rooms.keys());
  },

  getRoom(name) {
    return this.rooms.get(name) || null;
  },

  getSpawnPad(name) {
    const r = this.getRoom(name);
    return r?.pad || null;
  },

  getSpawnTransform(name) {
    const r = this.getRoom(name);
    if (!r) return null;

    const pad = r.pad;
    const p = new THREE.Vector3();
    pad.getWorldPosition(p);

    // face toward center
    const a = new THREE.Vector3();
    r.anchor.getWorldPosition(a);
    const dx = a.x - p.x;
    const dz = a.z - p.z;
    const rotY = Math.atan2(dx, dz);

    return { position: p, rotationY: rotY, clearRadius: r.clearRadius };
  }
};
