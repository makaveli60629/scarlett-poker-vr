// /// /js/alignment.js — Scarlett Poker VR — World Dimensions + Layout (PERMANENT)
// One place to define ALL measurements so floor/walls/table/pads align perfectly.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Align = {
  // --- Global room measurements (meters) ---
  ROOM_W: 34,
  ROOM_D: 34,
  WALL_H: 9.5,

  // --- Table placement ---
  TABLE_POS: new THREE.Vector3(0, 0, 0),
  TABLE_RADIUS: 2.35,
  TABLE_HEIGHT: 0.95,     // top height
  TABLE_COLLIDER_W: 6.4,  // matches your world collider box

  // --- Chairs ---
  CHAIR_COUNT: 6,
  CHAIR_RING_R: 3.1,

  // --- Teleport pads layout ---
  PAD_RADIUS: 0.95,
  PAD_Y: 0,
  PADS: [
    { id: "lobby",      label: "Lobby",      pos: new THREE.Vector3(0, 0, 11.5),  color: 0x00ffaa },
    { id: "vip",        label: "VIP",        pos: new THREE.Vector3(-11.5, 0, 0), color: 0xff2bd6 },
    { id: "store",      label: "Store",      pos: new THREE.Vector3(11.5, 0, 0),  color: 0x2bd7ff },
    { id: "tournament", label: "Tournament", pos: new THREE.Vector3(0, 0, -11.5), color: 0xffd27a },
  ],

  // --- Player rig defaults ---
  // This is “feel height”, NOT headset height. We keep your world stable.
  RIG_BASE_Y: 0.45,

  // When you’re “too short” sitting down, this raises your whole rig uniformly.
  // You can tweak later, but this will stay locked across sitting/standing.
  USER_HEIGHT_OFFSET_Y: 0.35,

  // Bounds margin so you never collide with the wall plane visually
  BOUNDS_INSET: 1.2,

  // Helper: bounds box based on room size
  bounds() {
    const w = this.ROOM_W, d = this.ROOM_D;
    const inset = this.BOUNDS_INSET;
    return {
      min: new THREE.Vector3(-w / 2 + inset, 0, -d / 2 + inset),
      max: new THREE.Vector3( w / 2 - inset, 0,  d / 2 - inset),
    };
  },

  // Helper: default spawn = lobby pad, never table center
  defaultSpawn() {
    const p = this.PADS.find(x => x.id === "lobby")?.pos || new THREE.Vector3(0, 0, 10);
    return p.clone();
  },
}; — Scarlett Poker VR — World Dimensions + Layout (PERMANENT)
// One place to define ALL measurements so floor/walls/table/pads align perfectly.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Align = {
  // --- Global room measurements (meters) ---
  ROOM_W: 34,
  ROOM_D: 34,
  WALL_H: 9.5,

  // --- Table placement ---
  TABLE_POS: new THREE.Vector3(0, 0, 0),
  TABLE_RADIUS: 2.35,
  TABLE_HEIGHT: 0.95,     // top height
  TABLE_COLLIDER_W: 6.4,  // matches your world collider box

  // --- Chairs ---
  CHAIR_COUNT: 6,
  CHAIR_RING_R: 3.1,

  // --- Teleport pads layout ---
  PAD_RADIUS: 0.95,
  PAD_Y: 0,
  PADS: [
    { id: "lobby",      label: "Lobby",      pos: new THREE.Vector3(0, 0, 11.5),  color: 0x00ffaa },
    { id: "vip",        label: "VIP",        pos: new THREE.Vector3(-11.5, 0, 0), color: 0xff2bd6 },
    { id: "store",      label: "Store",      pos: new THREE.Vector3(11.5, 0, 0),  color: 0x2bd7ff },
    { id: "tournament", label: "Tournament", pos: new THREE.Vector3(0, 0, -11.5), color: 0xffd27a },
  ],

  // --- Player rig defaults ---
  // This is “feel height”, NOT headset height. We keep your world stable.
  RIG_BASE_Y: 0.45,

  // When you’re “too short” sitting down, this raises your whole rig uniformly.
  // You can tweak later, but this will stay locked across sitting/standing.
  USER_HEIGHT_OFFSET_Y: 0.35,

  // Bounds margin so you never collide with the wall plane visually
  BOUNDS_INSET: 1.2,

  // Helper: bounds box based on room size
  bounds() {
    const w = this.ROOM_W, d = this.ROOM_D;
    const inset = this.BOUNDS_INSET;
    return {
      min: new THREE.Vector3(-w / 2 + inset, 0, -d / 2 + inset),
      max: new THREE.Vector3( w / 2 - inset, 0,  d / 2 - inset),
    };
  },

  // Helper: default spawn = lobby pad, never table center
  defaultSpawn() {
    const p = this.PADS.find(x => x.id === "lobby")?.pos || new THREE.Vector3(0, 0, 10);
    return p.clone();
  },
};
