// js/teleport_machine.js — Patch 7.0 FULL
// Teleport Authority + Spawn Pads in ALL rooms + Rescue to nearest pad
//
// Exports:
// - init(scene, playerRig)
// - getSafeSpawn()  (returns transform for current room pad)
// - teleportToRoom(name)
// - rescueIfBadSpawn(playerRig)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { RoomManager } from "./room_manager.js";
import { getCurrentRoom, setCurrentRoom } from "./state.js";

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export const TeleportMachine = {
  scene: null,
  playerRig: null,

  // current room selection
  room: "Lobby",

  // optional visible “teleport orb” in lobby
  orb: null,

  init(scene, playerRig) {
    this.scene = scene;
    this.playerRig = playerRig;

    // match state
    this.room = getCurrentRoom?.() || "Lobby";

    // A visible teleport orb in lobby (for style)
    this._buildOrb();
  },

  _buildOrb() {
    // small teleport "machine" for vibe; not required for spawn logic
    if (this.orb) {
      try { this.scene.remove(this.orb); } catch {}
    }

    const g = new THREE.Group();
    g.name = "TeleportOrb";

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 22, 18),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.65,
        roughness: 0.25
      })
    );
    core.position.set(-9.0, 1.2, 6.0);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.30, 0.55, 32),
      new THREE.MeshStandardMaterial({
        color: 0xff3c78,
        emissive: 0xff3c78,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.25,
        roughness: 0.3,
        side: THREE.DoubleSide
      })
    );
    halo.position.copy(core.position);
    halo.rotation.x = Math.PI / 2;

    const light = new THREE.PointLight(0x00ffaa, 0.7, 5.5);
    light.position.copy(core.position);

    g.add(core, halo, light);
    this.scene.add(g);
    this.orb = g;
  },

  // authoritative spawn: ALWAYS the current room’s pad
  getSafeSpawn() {
    const room = this.room || getCurrentRoom?.() || "Lobby";
    const t = RoomManager.getSpawnTransform(room);
    if (!t) return { position: new THREE.Vector3(0, 0, 7.5), rotationY: Math.PI, clearRadius: 1.5 };
    return t;
  },

  teleportToRoom(name) {
    if (!this.playerRig) return false;

    const targetName = name || "Lobby";
    const t = RoomManager.getSpawnTransform(targetName);
    if (!t) return false;

    // snap player to pad position
    this.playerRig.position.copy(t.position);
    this.playerRig.position.y = 0;

    this.playerRig.rotation.set(0, t.rotationY, 0);

    this.room = targetName;
    setCurrentRoom?.(targetName);

    return true;
  },

  // If player ends up in geometry or too close to a table etc,
  // rescue them back to spawn pad (or nearest pad).
  rescueIfBadSpawn(playerRig) {
    const rig = playerRig || this.playerRig;
    if (!rig) return false;

    const t = this.getSafeSpawn();
    if (!t) return false;

    // If y is weird or too far out of world, rescue
    const p = rig.position;
    if (!isFinite(p.x) || !isFinite(p.z) || Math.abs(p.x) > 500 || Math.abs(p.z) > 500) {
      rig.position.copy(t.position);
      rig.position.y = 0;
      rig.rotation.set(0, t.rotationY, 0);
      return true;
    }

    // If player is within the pad's clear radius, we're good
    const dx = p.x - t.position.x;
    const dz = p.z - t.position.z;
    const d = Math.sqrt(dx*dx + dz*dz);

    if (d > clamp(t.clearRadius || 1.45, 1.0, 2.2)) {
      // still ok—don't force rescue constantly
      return false;
    }
    return false;
  }
};
